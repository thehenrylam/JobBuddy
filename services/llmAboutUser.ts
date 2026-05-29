import { callLLM } from './llm';
import type { AboutUser } from '../lib/aboutUser/types';

const ABOUT_USER_PROMPT = `You are a profile extractor. Given one or both of the following sources — a RESUME and a USER PROMPT — extract a structured profile.

Rules:
- Extract fields from the resume first.
- If the user prompt contains a non-empty value for a field, it OVERRIDES the resume value for that field.
- Output ONLY a JSON code block with this exact schema (no extra keys, no explanation):

\`\`\`json
{
  "first_name": string | null,
  "last_name": string | null,
  "preferred_first_name": string | null,
  "preferred_last_name": string | null,
  "email_address": string | null,
  "phone_country_code": string | null,
  "phone_number": string | null,
  "url_linkedin_profile": string | null,
  "url_github_profile": string | null,
  "url_portfolio_site": string | null,
  "city_of_residence": string | null,
  "state_of_residence": string | null,
  "country_of_residence": string | null,
  "nationality": string | null,
  "citizenship_status": string | null,
  "summary": string | null,
  "skills": string[],
  "languages": string[],
  "experience": [{ "company": string, "role": string, "start": string, "end": string | null }],
  "education": [{ "institution": string, "degree": string, "year": string | null }]
  "self_disclosure_sex": string | null,
  "self_disclosure_gender": string | null,
  "self_disclosure_race": string | null,
  "self_disclosure_ethnicity": string | null,
  "self_disclosure_disability_physical": string | null,
  "self_disclosure_disability_mental": string | null,
  "self_disclosure_veteran_status": string | null,
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
    first_name: parsed.first_name ?? null,
    last_name: parsed.last_name ?? null,
    preferred_first_name: parsed.preferred_first_name ?? null,
    preferred_last_name: parsed.preferred_last_name ?? null,
    email_address: parsed.email_address ?? null,
    phone_country_code: parsed.phone_country_code ?? null,
    phone_number: parsed.phone_number ?? null,
    url_linkedin_profile: parsed.url_linkedin_profile ?? null,
    url_github_profile: parsed.url_github_profile ?? null,
    url_portfolio_site: parsed.url_portfolio_site ?? null,
    city_of_residence: parsed.city_of_residence ?? null,
    state_of_residence: parsed.state_of_residence ?? null,
    country_of_residence: parsed.country_of_residence ?? null,
    nationality: parsed.nationality ?? null,
    citizenship_status: parsed.citizenship_status ?? null,
    summary: parsed.summary ?? null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education: Array.isArray(parsed.education) ? parsed.education : [],
    self_disclosure_sex: parsed.self_disclosure_sex ?? null,
    self_disclosure_gender: parsed.self_disclosure_gender ?? null,
    self_disclosure_race: parsed.self_disclosure_race ?? null,
    self_disclosure_ethnicity: parsed.self_disclosure_ethnicity ?? null,
    self_disclosure_disability_physical: parsed.self_disclosure_disability_physical ?? null,
    self_disclosure_disability_mental: parsed.self_disclosure_disability_mental ?? null,
    self_disclosure_veteran_status: parsed.self_disclosure_veteran_status ?? null,
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
