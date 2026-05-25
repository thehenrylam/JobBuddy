import type { DetectionResult, DomScanData } from '../lib/jobDetect/types';
import { checkUrlSignals } from '../lib/jobDetect/urlPatterns';
import { checkStructuredDataSignals } from '../lib/jobDetect/structuredData';
import { checkDomSignals } from '../lib/jobDetect/domKeywords';
import { aggregateSignals } from '../lib/jobDetect/aggregate';
import { estimateTokens } from '../lib/jobDetect/tokenEstimate';

function scanDom(): DomScanData {
  const headings = Array.from(
    document.querySelectorAll('h1, h2, h3, h4'),
  ).map((el) => (el as HTMLElement).innerText.trim());

  const formLabels: string[] = [];
  const formButtonTexts: string[] = [];
  let hasFileInput = false;

  for (const form of Array.from(document.querySelectorAll('form'))) {
    for (const label of Array.from(form.querySelectorAll('label, legend'))) {
      const text = (label as HTMLElement).innerText.trim();
      if (text) formLabels.push(text);
    }

    for (const input of Array.from(
      form.querySelectorAll('input[placeholder], textarea[placeholder]'),
    )) {
      const ph = (input as HTMLInputElement).placeholder.trim();
      if (ph) formLabels.push(ph);
    }

    for (const btn of Array.from(
      form.querySelectorAll('button, input[type="submit"]'),
    )) {
      const text =
        (btn as HTMLButtonElement).innerText?.trim() ||
        (btn as HTMLInputElement).value?.trim();
      if (text) formButtonTexts.push(text);
    }

    if (form.querySelector('input[type="file"]')) {
      hasFileInput = true;
    }
  }

  return {
    headings,
    formLabels,
    formButtonTexts,
    hasFileInput,
    pageText: document.body.innerText,
  };
}

function getJsonLdScripts(): string[] {
  return Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  ).map((el) => el.textContent ?? '');
}

export async function detectPageType(): Promise<DetectionResult> {
  const domData = scanDom();
  const jsonScripts = getJsonLdScripts();

  const signals = [
    checkUrlSignals(window.location.href),
    checkStructuredDataSignals(jsonScripts),
    checkDomSignals(domData),
  ];

  const { classification, allReasons } = aggregateSignals(signals);
  const estimatedTokens = estimateTokens(domData.pageText);

  return { classification, signals: allReasons, estimatedTokens };
}
