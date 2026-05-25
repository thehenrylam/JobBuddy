import { callLLM } from './llm';
import { parseJobMarkdown } from '../lib/jobPost/parseMarkdown';
import { generateHash } from '../lib/hash';
import type { JobPost } from '../lib/jobPost/types';

const JOB_POST_PROMPT = `You are a job description formatter. Given web page content that may contain a job posting, extract and format it into structured markdown.

Output EXACTLY this format. Use NULL (no quotes) for any field you cannot determine:

# {job title here}

job_title: "{job title}"
company: "{company name}"
job_type: {one of: full_time, part_time, contract, internship, remote, hybrid, or NULL}
location: "{location}" or NULL
pay_range: [{numeric min}, {numeric max}] or NULL
date: {yyyy-mm-dd} or NULL
keywords: keyword1, keyword2, keyword3

---

{Clean markdown of the job description and application process. Remove all navigation menus, ads, footer content, cookie notices, and anything unrelated to the job post itself. Preserve structure with markdown headings and lists.}`;

function buildName(job_title: string, company: string, id: string): string {
  const title = job_title === 'NULL' ? 'Unknown' : job_title;
  const co = company === 'NULL' ? 'Unknown' : company;
  const truncated = title.length > 25 ? `${title.slice(0, 22)}...` : title;
  return `${truncated} - ${co} (${id.slice(-5)})`;
}

export async function createJobPost(
  { signal, text }: { signal?: AbortSignal; text?: string } = {},
): Promise<JobPost> {
  const pageText = text ?? document.body.innerText;

  const markdown = await callLLM({
    prompt: JOB_POST_PROMPT,
    data: pageText,
    max_tokens: 4096,
    signal,
  });

  const fields = parseJobMarkdown(markdown);
  const id = await generateHash(pageText + window.location.href + Date.now());
  const name = buildName(fields.job_title, fields.company, id);

  return { id, name, ...fields };
}
