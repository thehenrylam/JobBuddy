import type { JobPost } from './types';

type ParsedFields = Omit<JobPost, 'id' | 'name'>;

const NULL_SENTINEL = 'NULL';

function extractField(text: string, key: string): string {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return NULL_SENTINEL;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function parsePayRange(raw: string): [number | null, number | null] {
  if (!raw || raw.toUpperCase() === NULL_SENTINEL) return [null, null];
  const match = raw.match(/\[\s*([\d.]+|null)\s*,\s*([\d.]+|null)\s*\]/i);
  if (!match) return [null, null];
  const parse = (s: string) => (s.toLowerCase() === 'null' ? null : parseFloat(s));
  return [parse(match[1]), parse(match[2])];
}

function parseKeywords(raw: string): string[] {
  if (!raw || raw.toUpperCase() === NULL_SENTINEL) return [];
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

export function parseJobMarkdown(markdown: string): ParsedFields {
  const separatorIdx = markdown.indexOf('\n---');
  const header = separatorIdx !== -1 ? markdown.slice(0, separatorIdx) : markdown;
  const post_data = separatorIdx !== -1 ? markdown.slice(separatorIdx + 4).trim() : '';

  return {
    job_title: extractField(header, 'job_title'),
    company: extractField(header, 'company'),
    job_type: extractField(header, 'job_type'),
    location: extractField(header, 'location'),
    pay_range: parsePayRange(extractField(header, 'pay_range')),
    date: extractField(header, 'date'),
    keywords: parseKeywords(extractField(header, 'keywords')),
    post_data,
  };
}
