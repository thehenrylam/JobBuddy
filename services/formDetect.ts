import type { FieldType, FormField, FormSchema } from '../lib/form/types';

const FIELD_ID_PREFIX = 'jb-field-';
let fieldCounter = 0;

function nextId(): string {
  return `${FIELD_ID_PREFIX}${fieldCounter++}`;
}

function normaliseNameAttr(name: string): string {
  return name.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

function extractLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  const elId = el.getAttribute('id');
  if (elId) {
    const labelEl = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(elId)}"]`);
    if (labelEl) {
      const labelText = Array.from(labelEl.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !(n as Element).matches('input,select,textarea')))
        .map((n) => n.textContent?.trim())
        .filter(Boolean)
        .join(' ');
      if (labelText) return labelText;
    }
  }

  const ancestorLabel = el.closest('label');
  if (ancestorLabel) {
    const labelText = Array.from(ancestorLabel.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (labelText) return labelText;
  }

  const prevSibling = el.previousElementSibling;
  if (prevSibling && !prevSibling.matches('input,select,textarea,button')) {
    const text = prevSibling.textContent?.trim();
    if (text) return text;
  }

  const placeholder = (el as HTMLInputElement).placeholder?.trim();
  if (placeholder) return placeholder;

  const name = el.getAttribute('name');
  if (name) return normaliseNameAttr(name);

  return 'Unknown field';
}

function inputType(el: HTMLInputElement): FieldType {
  const t = (el.type || 'text').toLowerCase();
  switch (t) {
    case 'email': return 'email';
    case 'tel': return 'tel';
    case 'number': return 'number';
    case 'url': return 'url';
    case 'date': case 'datetime-local': case 'month': case 'week': return 'date';
    case 'radio': return 'radio';
    case 'checkbox': return 'checkbox';
    case 'file': return 'file';
    default: return 'text';
  }
}

function isSkippable(el: HTMLInputElement): boolean {
  const t = (el.type || '').toLowerCase();
  return ['hidden', 'submit', 'button', 'reset', 'image'].includes(t);
}

function scanScope(scope: Element): FormField[] {
  const fields: FormField[] = [];
  const seenRadioGroups = new Set<string>();

  // Handle nested fieldsets first
  const fieldsets = Array.from(scope.querySelectorAll<HTMLFieldSetElement>(':scope > fieldset, fieldset'));
  const fieldsetSet = new Set<HTMLFieldSetElement>();

  for (const fs of fieldsets) {
    // Only process direct or shallow fieldsets (avoid double-counting)
    if (fieldsetSet.has(fs)) continue;
    fieldsetSet.add(fs);

    const legend = fs.querySelector('legend')?.textContent?.trim() ?? 'Group';
    const id = nextId();
    fs.setAttribute('data-jb-field-id', id);
    const nested = scanScope(fs);

    // Track radio groups from nested scan so we don't re-add them at outer level
    for (const f of nested) {
      if (f.type === 'radio' && f.options) {
        // radio groups have their name encoded as the field id prefix — handled below
      }
    }

    if (nested.length > 0) {
      fields.push({ id, prompt: legend, type: 'text', required: false, response: null, fields: nested });
    }
  }

  const inputs = Array.from(scope.querySelectorAll<HTMLInputElement>(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image])'
  ));
  const textareas = Array.from(scope.querySelectorAll<HTMLTextAreaElement>('textarea'));
  const selects = Array.from(scope.querySelectorAll<HTMLSelectElement>('select'));

  // Deduplicate: skip elements that belong to a nested fieldset already processed
  const nestedEls = new Set<Element>();
  for (const fs of fieldsets) {
    for (const el of fs.querySelectorAll('input,textarea,select')) {
      nestedEls.add(el);
    }
  }

  for (const el of inputs) {
    if (nestedEls.has(el)) continue;
    if (isSkippable(el)) continue;

    const type = inputType(el);

    if (type === 'radio') {
      const groupName = el.getAttribute('name') ?? '';
      if (seenRadioGroups.has(groupName)) continue;
      seenRadioGroups.add(groupName);

      const groupEls = Array.from(
        scope.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(groupName)}"]`)
      );
      const id = nextId();
      // Assign same id to all radios in group for fill lookup
      groupEls.forEach((r, i) => r.setAttribute('data-jb-field-id', i === 0 ? id : `${id}-${i}`));
      const options = groupEls.map((r) => r.value).filter(Boolean);
      const prompt = extractLabel(groupEls[0]);
      fields.push({ id, prompt, type: 'radio', options, required: el.required, response: null });
      continue;
    }

    const id = nextId();
    el.setAttribute('data-jb-field-id', id);
    fields.push({
      id,
      prompt: extractLabel(el),
      type,
      required: el.required,
      response: null,
    });
  }

  for (const el of textareas) {
    if (nestedEls.has(el)) continue;
    const id = nextId();
    el.setAttribute('data-jb-field-id', id);
    fields.push({ id, prompt: extractLabel(el), type: 'textarea', required: el.required, response: null });
  }

  for (const el of selects) {
    if (nestedEls.has(el)) continue;
    const id = nextId();
    el.setAttribute('data-jb-field-id', id);
    const options = Array.from(el.options).map((o) => o.text.trim()).filter(Boolean);
    const type: FieldType = el.multiple ? 'multiselect' : 'select';
    fields.push({ id, prompt: extractLabel(el), type, options, required: el.required, response: null });
  }

  return fields;
}

export function scanFormFields(): FormSchema {
  fieldCounter = 0;
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
  const scopes: Element[] = forms.length > 0 ? forms : [document.body];

  const fields: FormField[] = [];
  for (const scope of scopes) {
    fields.push(...scanScope(scope));
  }

  return { fields };
}
