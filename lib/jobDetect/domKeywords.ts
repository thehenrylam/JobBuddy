import type { DomScanData, PageSignal } from './types';

const JOB_POST_HEADING_KEYWORDS = [
  'responsibilities',
  'qualifications',
  'requirements',
  "what you'll do",
  'about the role',
  'about the position',
  "we're looking for",
  'we are looking for',
  'skills',
  'compensation',
  'salary',
  'benefits',
];

const JOB_FORM_LABEL_KEYWORDS = [
  'resume',
  ' cv ',
  'cover letter',
  'linkedin',
  'portfolio',
  'work authorization',
  'start date',
  'salary expectation',
  'years of experience',
];

const JOB_FORM_BUTTON_KEYWORDS = ['apply now', 'submit application', 'apply'];

function matchesAny(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  return keywords.find((kw) => lower.includes(kw)) ?? null;
}

export function checkDomSignals(data: DomScanData): PageSignal {
  const reasons: string[] = [];
  let isJobPost = false;
  let isJobForm = false;

  for (const heading of data.headings) {
    const match = matchesAny(heading, JOB_POST_HEADING_KEYWORDS);
    if (match) {
      isJobPost = true;
      reasons.push(`Heading keyword: "${match}"`);
      break;
    }
  }

  for (const label of data.formLabels) {
    const match = matchesAny(label, JOB_FORM_LABEL_KEYWORDS);
    if (match) {
      isJobForm = true;
      reasons.push(`Form label keyword: "${match.trim()}"`);
      break;
    }
  }

  if (!isJobForm) {
    for (const btnText of data.formButtonTexts) {
      const match = matchesAny(btnText, JOB_FORM_BUTTON_KEYWORDS);
      if (match) {
        isJobForm = true;
        reasons.push(`Form button keyword: "${match}"`);
        break;
      }
    }
  }

  if (!isJobForm && data.hasFileInput) {
    isJobForm = true;
    reasons.push('Form contains file upload input (likely resume)');
  }

  return { isJobPost, isJobForm, reasons };
}
