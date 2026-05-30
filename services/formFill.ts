import type { FormField, FormSchema } from '../lib/form/types';
import type { AboutUser } from '../lib/aboutUser/types';

// ── Pattern-based pre-fill map ────────────────────────────────────────────────

type AboutUserKey = keyof AboutUser;

interface FieldRule {
  patterns: string[];
  resolve: (user: AboutUser) => string | null;
}

const FIELD_RULES: FieldRule[] = [
  { patterns: ['first name', 'given name', 'first legal name'], resolve: (u) => u.first_name },
  { patterns: ['last name', 'surname', 'family name', 'last legal name'], resolve: (u) => u.last_name },
  { patterns: ['full name', 'legal name'], resolve: (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || null },
  { patterns: ['email'], resolve: (u) => u.email_address },
  { patterns: ['phone', 'telephone', 'mobile', 'cell'], resolve: (u) => u.phone_number },
  { patterns: ['city'], resolve: (u) => u.city_of_residence },
  { patterns: ['state', 'province', 'region'], resolve: (u) => u.state_of_residence },
  { patterns: ['country'], resolve: (u) => u.country_of_residence },
  { patterns: ['linkedin'], resolve: (u) => u.url_linkedin_profile },
  { patterns: ['github'], resolve: (u) => u.url_github_profile },
  { patterns: ['portfolio', 'personal site', 'personal website', 'website'], resolve: (u) => u.url_portfolio_site },
  { patterns: ['nationality'], resolve: (u) => u.nationality },
  { patterns: ['citizenship'], resolve: (u) => u.citizenship_status },
];

function matchRule(prompt: string): FieldRule | undefined {
  const lower = prompt.toLowerCase();
  return FIELD_RULES.find((rule) => rule.patterns.some((p) => lower.includes(p)));
}

function prefillField(field: FormField, user: AboutUser): FormField {
  if (field.fields) {
    return { ...field, fields: field.fields.map((f) => prefillField(f, user)) };
  }
  if (field.response !== null || field.type === 'file') return field;
  const rule = matchRule(field.prompt);
  if (!rule) return field;
  const value = rule.resolve(user);
  return value != null ? { ...field, response: value } : field;
}

export function prefillFields(schema: FormSchema, user: AboutUser): FormSchema {
  return { fields: schema.fields.map((f) => prefillField(f, user)) };
}

// ── Flatten helpers ───────────────────────────────────────────────────────────

export function flattenFields(fields: FormField[]): FormField[] {
  const out: FormField[] = [];
  for (const f of fields) {
    if (f.fields) {
      out.push(...flattenFields(f.fields));
    } else {
      out.push(f);
    }
  }
  return out;
}

// ── AI prompt builder ─────────────────────────────────────────────────────────

export function buildAutofillPrompt(nullFields: FormField[]): string {
  const schema = JSON.stringify(nullFields, null, 2);
  return `I'm filling out a job application form and need help with fields I couldn't automatically answer.
Respond ONLY with a JSON code block. Keys are field IDs, values are your answers.
- select/radio: value must be one of the listed options
- multiselect/checkbox with options: array of chosen option strings
- checkbox (boolean, no options): true or false
- text/textarea: concise, professional responses based on the resume and job posting
- Omit any field you are not confident answering

\`\`\`json
{}
\`\`\`

Fields needing responses:
${schema}`;
}

// ── AI response merge ─────────────────────────────────────────────────────────

function mergeInto(fields: FormField[], aiMap: Record<string, unknown>): void {
  for (const f of fields) {
    if (f.fields) {
      mergeInto(f.fields, aiMap);
    } else if (f.id in aiMap && f.response === null) {
      (f as { response: unknown }).response = aiMap[f.id] ?? null;
    }
  }
}

export function mergeAiResponses(schema: FormSchema, aiMap: Record<string, unknown>): void {
  mergeInto(schema.fields, aiMap);
}

// ── DOM fill helpers ──────────────────────────────────────────────────────────

function fillInput(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillSelect(el: HTMLSelectElement, value: string): void {
  const lower = value.toLowerCase();
  const idx = Array.from(el.options).findIndex(
    (o) => o.text.trim().toLowerCase() === lower || o.value.toLowerCase() === lower
  );
  if (idx !== -1) {
    el.selectedIndex = idx;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function fillMultiselect(el: HTMLSelectElement, values: string[]): void {
  const lowerValues = values.map((v) => v.toLowerCase());
  let changed = false;
  for (const option of el.options) {
    const matches =
      lowerValues.includes(option.text.trim().toLowerCase()) ||
      lowerValues.includes(option.value.toLowerCase());
    if (option.selected !== matches) {
      option.selected = matches;
      changed = true;
    }
  }
  if (changed) el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillRadio(groupName: string, value: string, scope: Document | Element = document): void {
  const lower = value.toLowerCase();
  const radios = Array.from(
    scope.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(groupName)}"]`)
  );
  const match = radios.find((r) => r.value.toLowerCase() === lower);
  if (match) {
    match.checked = true;
    match.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function fillCheckbox(el: HTMLInputElement, value: boolean): void {
  if (el.checked !== value) {
    el.checked = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function applyField(field: FormField): void {
  if (field.response === null || field.type === 'file') return;
  if (field.fields) {
    for (const sub of field.fields) applyField(sub);
    return;
  }

  if (field.type === 'radio') {
    const firstRadio = document.querySelector<HTMLInputElement>(`[data-jb-field-id="${CSS.escape(field.id)}"]`);
    if (firstRadio?.name) fillRadio(firstRadio.name, String(field.response));
    return;
  }

  const el = document.querySelector<HTMLElement>(`[data-jb-field-id="${CSS.escape(field.id)}"]`);
  if (!el) return;

  if (field.type === 'select' && el instanceof HTMLSelectElement) {
    fillSelect(el, String(field.response));
  } else if (field.type === 'multiselect' && el instanceof HTMLSelectElement) {
    fillMultiselect(el, Array.isArray(field.response) ? (field.response as string[]) : [String(field.response)]);
  } else if (field.type === 'checkbox' && el instanceof HTMLInputElement) {
    fillCheckbox(el, Boolean(field.response));
  } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    fillInput(el, String(field.response));
  }
}

export function fillFormFields(schema: FormSchema): void {
  for (const field of schema.fields) {
    applyField(field);
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function cleanupFieldIds(): void {
  document.querySelectorAll('[data-jb-field-id]').forEach((el) => {
    el.removeAttribute('data-jb-field-id');
  });
}
