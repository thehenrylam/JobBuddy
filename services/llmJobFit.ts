import { callLLM } from './llm';
import { extractJsonBlock } from '../lib/extractJsonBlock';
import type { JobPost, FitAnalysis } from '../lib/jobPost/types';

const SYSTEM_PROMPT = `You are a helpful AI assisting the user with their job application process. You will be given a job posting, the applicant's resume, and a user prompt with additional context about their preferences and goals.

First, determine if the job posting is valid and real. If it appears to be a scam, spam, test content, or entirely unrelated to a job posting, set score to "N/A", explain why in comment, and leave alert empty.

If valid, provide an honest assessment of how the applicant's resume holds up against the posting. Consider both technical fit (skills, experience level, education, keywords) and personal fit (location, job type, salary expectations, work-life balance, culture preferences, and any other goals stated in the user prompt).

Output ONLY a JSON code block with this exact schema:

\`\`\`json
{
  "score": "X/10",
  "comment": "...",
  "alert": ["...", "..."]
}
\`\`\`

Rules:
- score: a rating string out of 10 (e.g. "7/10"), or "N/A" if the posting is invalid.
- comment: 2–3 sentences summarising fit — be honest and specific, not generic.
- alert: an array of 0–3 strings, each flagging something that meaningfully doesn't align (missing required skill, location mismatch, overqualified/underqualified, potential red flag). Omit minor or uncertain items. Use an empty array [] if nothing significant stands out.`;

function buildData(post: JobPost, resumeText: string, userPromptText: string): string {
  return [
    `=== JOB POSTING ===\n${post.post_data}`,
    `=== RESUME ===\n${resumeText}`,
    `=== USER PROMPT ===\n${userPromptText}`,
  ].join('\n\n');
}

const MAX_ALERT_ITEMS = 3;

function parseResponse(raw: string): FitAnalysis {
  const parsed = extractJsonBlock(raw) as Partial<FitAnalysis>;
  return {
    score: parsed.score ?? 'N/A',
    comment: parsed.comment ?? '',
    alert: Array.isArray(parsed.alert) ? parsed.alert.slice(0, MAX_ALERT_ITEMS) : [],
  };
}

export async function analyzeFit(
  post: JobPost,
  resumeText: string,
  userPromptText: string,
  signal?: AbortSignal,
): Promise<FitAnalysis> {
  const data = buildData(post, resumeText, userPromptText);
  const raw = await callLLM({ prompt: SYSTEM_PROMPT, data, max_tokens: 1024, signal });
  return parseResponse(raw);
}
