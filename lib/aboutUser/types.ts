export interface ResumeFile {
  filename: string;
  mimeType: string;
  base64: string;
  text: string;
}

export interface UserPromptFile {
  filename: string;
  content: string;
}

export interface AboutUser {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[];
  languages: string[];
  experience: Array<{ company: string; role: string; start: string; end: string | null }>;
  education: Array<{ institution: string; degree: string; year: string | null }>;
}

export type AboutUserStatus = 'critical' | 'caution' | 'okay' | 'working' | 'waiting';

// Fingerprints of the source files used for the most-recent successful LLM parse.
// Stored separately so we can detect when a source has changed and invalidate the cache.
export interface SourceHash {
  resumeHash: string | null;
  promptHash: string | null;
}
