import type { PageClassification, PageSignal } from './types';

export function aggregateSignals(signals: PageSignal[]): {
  classification: PageClassification;
  allReasons: string[];
} {
  const isJobPost = signals.some((s) => s.isJobPost);
  const isJobForm = signals.some((s) => s.isJobForm);
  const allReasons = [...new Set(signals.flatMap((s) => s.reasons))];

  let classification: PageClassification;
  if (isJobPost && isJobForm) classification = 'both';
  else if (isJobPost) classification = 'job_post';
  else if (isJobForm) classification = 'job_form';
  else classification = 'unknown';

  return { classification, allReasons };
}
