export type PageClassification = 'job_post' | 'job_form' | 'both' | 'unknown';

export interface PageSignal {
  isJobPost: boolean;
  isJobForm: boolean;
  reasons: string[];
}

export interface DomScanData {
  headings: string[];
  formLabels: string[];
  formButtonTexts: string[];
  hasFileInput: boolean;
  pageText: string;
}

export interface DetectionResult {
  classification: PageClassification;
  signals: string[];
  estimatedTokens: number;
}
