import type { ResumeFile, UserPromptFile, AboutUser, SourceHash, ParseStatus } from '../lib/aboutUser/types';

const RESUME_KEY = 'resumeFile';
const USER_PROMPT_KEY = 'userPromptFile';
const ABOUT_USER_KEY = 'aboutUser';
const SOURCE_HASH_KEY = 'aboutUserSourceHash';
const PARSE_STATUS_KEY = 'aboutUserParseStatus';

// Sampled djb2 hash — fast even on multi-MB base64 strings.
// Samples up to ~4 096 characters plus includes the total length so files
// of different sizes but similar prefixes still produce different hashes.
export function computeHash(s: string): string {
  const step = Math.max(1, Math.floor(s.length / 4096));
  let h = 5381;
  for (let i = 0; i < s.length; i += step) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  h = ((h << 5) + h) ^ s.length;
  return (h >>> 0).toString(16);
}

export const DEFAULT_USER_PROMPT = `# USER.md 
## About The User

I am a person looking to land a job

## Additional Data

name:
email:
phone:
location:

## Extra Instructions

- Be concise with the answer: brief summaries only unless otherwise instructed.
- Responses to questions must be kept professional unless otherwise instructed.
- Do not guess when answering, if unsure about info, ask the user, or omit it from the output.

`;

export async function getResumeFile(): Promise<ResumeFile | null> {
  const result = await browser.storage.local.get(RESUME_KEY);
  return (result[RESUME_KEY] as ResumeFile) ?? null;
}

export async function saveResumeFile(f: ResumeFile): Promise<void> {
  await browser.storage.local.set({ [RESUME_KEY]: f });
}

export async function clearResumeFile(): Promise<void> {
  await browser.storage.local.remove(RESUME_KEY);
}

export async function getUserPromptFile(): Promise<UserPromptFile | null> {
  const result = await browser.storage.local.get(USER_PROMPT_KEY);
  return (result[USER_PROMPT_KEY] as UserPromptFile) ?? null;
}

export async function saveUserPromptFile(f: UserPromptFile): Promise<void> {
  await browser.storage.local.set({ [USER_PROMPT_KEY]: f });
}

export async function resetUserPromptToDefault(): Promise<void> {
  await saveUserPromptFile({ filename: 'default-profile.md', content: DEFAULT_USER_PROMPT });
}

export async function getAboutUser(): Promise<AboutUser | null> {
  const result = await browser.storage.local.get(ABOUT_USER_KEY);
  return (result[ABOUT_USER_KEY] as AboutUser) ?? null;
}

export async function saveAboutUser(a: AboutUser): Promise<void> {
  await browser.storage.local.set({ [ABOUT_USER_KEY]: a });
}

export async function clearAboutUser(): Promise<void> {
  await browser.storage.local.remove(ABOUT_USER_KEY);
}

export async function getSourceHash(): Promise<SourceHash | null> {
  const result = await browser.storage.local.get(SOURCE_HASH_KEY);
  return (result[SOURCE_HASH_KEY] as SourceHash) ?? null;
}

export async function saveSourceHash(h: SourceHash): Promise<void> {
  await browser.storage.local.set({ [SOURCE_HASH_KEY]: h });
}

export async function clearSourceHash(): Promise<void> {
  await browser.storage.local.remove(SOURCE_HASH_KEY);
}

export async function getParseStatus(): Promise<ParseStatus | null> {
  const result = await browser.storage.local.get(PARSE_STATUS_KEY);
  return (result[PARSE_STATUS_KEY] as ParseStatus) ?? null;
}

export async function saveParseStatus(s: ParseStatus): Promise<void> {
  await browser.storage.local.set({ [PARSE_STATUS_KEY]: s });
}

export async function clearParseStatus(): Promise<void> {
  await browser.storage.local.remove(PARSE_STATUS_KEY);
}
