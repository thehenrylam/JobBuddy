import { checkDomSignals } from '../lib/jobDetect/domKeywords';
import { aggregateSignals } from '../lib/jobDetect/aggregate';
import { estimateTokens } from '../lib/jobDetect/tokenEstimate';
import type { DetectionResult } from '../lib/jobDetect/types';

export function detectSelectedText(text: string): DetectionResult {
  // Split into lines so multi-line selections are checked line by line
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const signal = checkDomSignals({
    headings: lines,
    formLabels: lines,
    formButtonTexts: lines,
    hasFileInput: false,
    pageText: text,
  });

  const { classification, allReasons } = aggregateSignals([signal]);
  return { classification, signals: allReasons, estimatedTokens: estimateTokens(text) };
}
