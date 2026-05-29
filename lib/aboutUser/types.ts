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
  first_name: string | null;
  last_name: string | null;
  preferred_first_name: string | null;
  preferred_last_name: string | null;
  email_address: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  url_linkedin_profile: string | null;
  url_github_profile: string | null;
  url_portfolio_site: string | null;
  city_of_residence: string | null;
  state_of_residence: string | null;
  country_of_residence: string | null;
  nationality: string | null;
  citizenship_status: string | null;
  summary: string | null;
  skills: string[];
  languages: string[];
  experience: Array<{ company: string; role: string; start: string; end: string | null }>;
  education: Array<{ institution: string; degree: string; year: string | null }>;
  self_disclosure_sex: string | null;
  self_disclosure_gender: string | null;
  self_disclosure_race: string | null;
  self_disclosure_ethnicity: string | null;
  self_disclosure_disability_physical: string | null;
  self_disclosure_disability_mental: string | null;
  self_disclosure_veteran_status: string | null;
}

export type AboutUserStatus = 'critical' | 'caution' | 'okay' | 'working' | 'waiting';

export type ParseStatus = 'idle' | 'waiting' | 'working';

// Fingerprints of the source files used for the most-recent successful LLM parse.
// Stored separately so we can detect when a source has changed and invalidate the cache.
export interface SourceHash {
  resumeHash: string | null;
  promptHash: string | null;
}
