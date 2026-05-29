import { callLLM } from './llm';
import type { AboutUser } from '../lib/aboutUser/types';

const ABOUT_USER_PROMPT = `You are a profile extractor. Given one or both of the following sources — a RESUME and a USER PROMPT — extract a structured profile.

Rules:
- Extract fields from the resume first.
- If the user prompt contains a non-empty value for a field, it OVERRIDES the resume value for that field.
- Output ONLY a JSON code block with this exact schema (no extra keys, no explanation):

\`\`\`json
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "skills": string[],
  "languages": string[],
  "experience": [{ "company": string, "role": string, "start": string, "end": string | null }],
  "education": [{ "institution": string, "degree": string, "year": string | null }]
}
\`\`\`

Use null for any string field you cannot determine. Use [] for any array field with no data.
For "start" and "end" use "YYYY-MM" format if known, or just the year "YYYY". "end" is null if still current.`;

function buildData(resumeText: string | null, userPromptText: string | null): string {
  const parts: string[] = [];
  if (resumeText) {
    parts.push(`=== RESUME ===\n${resumeText}`);
  }
  if (userPromptText) {
    parts.push(`=== USER PROMPT ===\n${userPromptText}`);
  }
  return parts.join('\n\n');
}

function parseResponse(raw: string): AboutUser {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw.trim();
  const parsed = JSON.parse(jsonStr) as AboutUser;
  return {
    name: parsed.name ?? null,
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    location: parsed.location ?? null,
    summary: parsed.summary ?? null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
  };
}

export async function parseAboutUser(
  resumeText: string | null,
  userPromptText: string | null,
  signal?: AbortSignal,
): Promise<AboutUser> {
  const data = buildData(resumeText, userPromptText);
  const raw = await callLLM({ prompt: ABOUT_USER_PROMPT, data, max_tokens: 2048, signal });
  return parseResponse(raw);
}
