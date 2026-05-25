import type { PageSignal } from './types';

function hasJobPosting(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  const type = obj['@type'];
  if (typeof type === 'string' && type.toLowerCase() === 'jobposting') return true;
  if (Array.isArray(type) && type.some((t) => typeof t === 'string' && t.toLowerCase() === 'jobposting')) return true;

  // @graph array (common in schema.org multi-entity documents)
  const graph = obj['@graph'];
  if (Array.isArray(graph) && graph.some(hasJobPosting)) return true;

  return false;
}

export function checkStructuredDataSignals(rawJsonScripts: string[]): PageSignal {
  for (const raw of rawJsonScripts) {
    try {
      const parsed: unknown = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      if (items.some(hasJobPosting)) {
        return {
          isJobPost: true,
          isJobForm: false,
          reasons: ['JSON-LD schema contains JobPosting type'],
        };
      }
    } catch {
      // malformed JSON — skip this script
    }
  }
  return { isJobPost: false, isJobForm: false, reasons: [] };
}
