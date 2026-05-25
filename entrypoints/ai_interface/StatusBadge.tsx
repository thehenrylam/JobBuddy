import React from 'react';
import type { DetectionResult, PageClassification } from '../../lib/jobDetect/types';
import { TOKEN_MAX } from '../../lib/jobDetect/tokenEstimate';

const BADGE_LABELS: Record<PageClassification, string> = {
  job_post: 'Job Post',
  job_form: 'Job Form',
  both: 'Post + Form',
  unknown: 'Unknown',
};

const BADGE_COLORS: Record<PageClassification, { bg: string; text: string; border: string }> = {
  job_post: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  job_form: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  both: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  unknown: { bg: '#f5f5f5', text: '#6b7280', border: '#e5e7eb' },
};

function meterColor(pct: number): string {
  if (pct < 25) return '#16a34a';
  if (pct < 75) return '#d97706';
  return '#dc2626';
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function StatusBadge({ result, isSelection }: { result: DetectionResult | null; isSelection?: boolean }) {
  if (!result) {
    return (
      <div style={styles.container}>
        <span style={styles.scanning}>Scanning…</span>
      </div>
    );
  }

  const { classification, estimatedTokens } = result;
  const colors = BADGE_COLORS[classification];
  const usedPct = Math.min((estimatedTokens / TOKEN_MAX) * 100, 100);
  const remaining = Math.max(TOKEN_MAX - estimatedTokens, 0);
  const barColor = meterColor(usedPct);

  return (
    <div style={styles.container}>
      <div style={styles.badgeRow}>
        <span style={{ ...styles.badge, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
          {BADGE_LABELS[classification]}
        </span>
        {isSelection && (
          <span style={styles.selectionTag}>selection</span>
        )}
      </div>
      <span style={styles.tokenCount}>~{formatK(estimatedTokens)} tokens</span>
      <div style={styles.meterTrack}>
        <div style={{ ...styles.meterFill, width: `${usedPct}%`, background: barColor }} />
      </div>
      <span style={styles.remaining}>{formatK(remaining)} remaining</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
    padding: '0 4px',
  },
  scanning: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: 'sans-serif',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 4,
    fontFamily: 'sans-serif',
  },
  selectionTag: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'sans-serif',
    letterSpacing: '0.03em',
  },
  tokenCount: {
    fontSize: 10,
    color: '#374151',
    fontFamily: 'sans-serif',
    whiteSpace: 'nowrap',
  },
  meterTrack: {
    height: 4,
    borderRadius: 2,
    background: '#e5e7eb',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  remaining: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'sans-serif',
    whiteSpace: 'nowrap',
  },
};
