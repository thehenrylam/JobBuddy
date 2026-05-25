import type { PageSignal } from './types';

const KNOWN_JOB_BOARD_DOMAINS = [
  'greenhouse.io',
  'boards.greenhouse.io',
  'lever.co',
  'jobs.lever.co',
  'workday.com',
  'myworkdayjobs.com',
  'indeed.com',
  'glassdoor.com',
  'monster.com',
  'ziprecruiter.com',
  'dice.com',
  'smartrecruiters.com',
  'jobvite.com',
  'icims.com',
  'taleo.net',
  'bamboohr.com',
  'linkedin.com',
];

const JOB_PATH_KEYWORDS = [
  '/jobs/',
  '/job/',
  '/careers/',
  '/career/',
  '/apply/',
  '/application/',
  '/openings/',
  '/opportunities/',
];

export function checkUrlSignals(url: string): PageSignal {
  const reasons: string[] = [];
  let isJobPost = false;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    const matchedDomain = KNOWN_JOB_BOARD_DOMAINS.find(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );
    if (matchedDomain) {
      // linkedin.com/jobs/* is a job post; linkedin.com alone is not
      if (matchedDomain !== 'linkedin.com' || pathname.startsWith('/jobs')) {
        isJobPost = true;
        reasons.push(`Known job board domain: ${matchedDomain}`);
      }
    }

    const matchedPath = JOB_PATH_KEYWORDS.find((kw) => pathname.includes(kw));
    if (matchedPath) {
      isJobPost = true;
      reasons.push(`Job-related URL path: ${matchedPath}`);
    }
  } catch {
    // invalid URL — skip
  }

  return { isJobPost, isJobForm: false, reasons };
}
