import React, { useState, useEffect } from 'react';
import { type LLMConfig } from '../../services/llm';
import { getSavedPosts } from '../../services/savedPosts';
import type { DetectionResult, PageClassification } from '../../lib/jobDetect/types';

const DRAFT_KEY = 'llmConfigDraft';

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={15} height={15}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={15} height={15}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={15} height={15}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function HashtagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={15} height={15}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={15} height={15}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" width={12} height={12}
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

const CLASSIFICATION_LABELS: Record<PageClassification, string> = {
  job_post: 'Job Post',
  job_form: 'Job Form',
  both: 'Post + Form',
  unknown: 'Unknown',
};

const CLASSIFICATION_COLORS: Record<PageClassification, { color: string; background: string; border: string }> = {
  job_post: { color: '#1d4ed8', background: '#eff6ff', border: '#bfdbfe' },
  job_form: { color: '#15803d', background: '#f0fdf4', border: '#bbf7d0' },
  both: { color: '#7e22ce', background: '#faf5ff', border: '#e9d5ff' },
  unknown: { color: '#6b7280', background: '#f5f5f5', border: '#e5e7eb' },
};

export default function SettingsView({ onBack, onLlmSettings, onSavedPosts }: { onBack: () => void; onLlmSettings: () => void; onSavedPosts: () => void }) {
  const [savedConfig, setSavedConfig] = useState<LLMConfig | null>(null);
  const [savedPostCount, setSavedPostCount] = useState(0);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [tokenEstimate, setTokenEstimate] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    browser.storage.local.get('llmConfig').then((result) => {
      setSavedConfig(result.llmConfig ?? null);
    });
    getSavedPosts().then((posts) => setSavedPostCount(posts.length)).catch(() => {});
  }, []);

  const handleClear = async () => {
    await browser.storage.local.remove(['llmConfig', DRAFT_KEY]);
    setSavedConfig(null);
  };

  const handleDownloadDom = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        const text = document.body.innerText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: `dom-${Date.now()}.txt` });
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  const handleEstimateTokens = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => document.body.innerText,
    });
    const text = results[0].result as string;
    const count = Math.ceil(text.length / 4);
    setTokenEstimate(`~${count.toLocaleString()} tokens (estimated)`);
  };

  const handleRunDetection = async () => {
    setDetecting(true);
    setDetectionResult(null);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const result = await browser.tabs.sendMessage(tab.id!, { type: 'JB_RUN_DETECTION' }) as DetectionResult;
      setDetectionResult(result);
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button className="jb-btn-ghost" style={styles.backButton} onClick={onBack} title="Back">←</button>
        <span style={styles.title}>Settings</span>
      </div>

      <section>
        <p style={styles.sectionLabel}>LLM</p>
        <div style={styles.configCard}>
          <div style={styles.configDetails}>
            {savedConfig ? (
              <>
                <span style={styles.configBadge}>
                  {savedConfig.type === 'local' ? 'Local' : 'API'}
                </span>
                <span style={styles.configUrl}>{savedConfig.baseUrl}</span>
                {savedConfig.model && (
                  <span style={styles.configModel}>{savedConfig.model}</span>
                )}
              </>
            ) : (
              <>
                <span style={styles.configBadgeNone}>None</span>
                <span style={styles.commentText}>Set up the LLM endpoint here.</span>
              </>
            )}
          </div>
          <div style={styles.configActions}>
            <button className="jb-btn-icon" style={styles.iconButton} onClick={onLlmSettings} title="Edit">
              <PencilIcon />
            </button>
            {savedConfig && (
              <button className="jb-btn-icon" style={{ ...styles.iconButton, ...styles.iconButtonDanger }} onClick={handleClear} title="Clear">
                <TrashIcon />
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <p style={styles.sectionLabel}>Saved Posts</p>
        <div style={styles.configCard}>
          <div style={styles.configDetails}>
            <span style={styles.configUrl}>{savedPostCount} saved post{savedPostCount !== 1 ? 's' : ''}</span>
          </div>
          <div style={styles.configActions}>
            <button className="jb-btn-ghost" style={styles.manageButton} onClick={onSavedPosts}>
              Manage →
            </button>
          </div>
        </div>
      </section>

      <section>
        <button style={styles.devToolsHeader} onClick={() => setDevToolsOpen(o => !o)}>
          <ChevronIcon open={devToolsOpen} />
          <span style={styles.sectionLabel}>Developer Tools</span>
        </button>

        {devToolsOpen && (
          <div style={styles.devToolsBody}>
            <div style={styles.devToolsRow}>
              <button className="jb-btn-icon" style={styles.iconButton} onClick={handleDownloadDom} title="Download DOM">
                <DownloadIcon />
              </button>
              <span style={styles.devToolsLabel}>Download page text as a .txt file</span>
            </div>

            <div style={styles.devToolsRow}>
              <button className="jb-btn-icon" style={styles.iconButton} onClick={handleEstimateTokens} title="Estimate tokens">
                <HashtagIcon />
              </button>
              <span style={styles.devToolsLabel}>Estimate token count of page text</span>
            </div>

            {tokenEstimate && (
              <div style={styles.devToolsResult}>{tokenEstimate}</div>
            )}

            <div style={styles.devToolsRow}>
              <button className="jb-btn-icon" style={styles.iconButton} onClick={handleRunDetection} title="Detect page type" disabled={detecting}>
                <SearchIcon />
              </button>
              <span style={styles.devToolsLabel}>Detect page type</span>
            </div>

            {detectionResult && (() => {
              const colors = CLASSIFICATION_COLORS[detectionResult.classification];
              return (
                <div style={{ ...styles.devToolsResult, background: colors.background, border: `1px solid ${colors.border}`, color: colors.color }}>
                  <span style={{ fontWeight: 700 }}>{CLASSIFICATION_LABELS[detectionResult.classification]}</span>
                  {' · '}~{detectionResult.estimatedTokens.toLocaleString()} tokens
                  {detectionResult.signals.length > 0 && (
                    <ul style={{ margin: '4px 0 0', paddingLeft: 14 }}>
                      {detectionResult.signals.map((s) => (
                        <li key={s} style={{ fontSize: 10 }}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 300,
    padding: 16,
    fontFamily: 'sans-serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    color: '#444',
    padding: '0 4px',
    lineHeight: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 8px',
  },
  configCard: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    background: '#fafafa',
  },
  configDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  configBadge: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#2563eb',
  },
  configBadgeNone: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#dc2626',
  },
  commentText: {
    fontSize: 11,
    color: '#333',
    wordBreak: 'break-all',
  },
  configUrl: {
    fontSize: 11,
    color: '#333',
    wordBreak: 'break-all',
  },
  configModel: {
    fontSize: 11,
    color: '#666',
    wordBreak: 'break-all',
  },
  configActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
    alignItems: 'flex-start',
  },
  iconButton: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 5,
    cursor: 'pointer',
    color: '#555',
  },
  iconButtonDanger: {
    color: '#dc2626',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
  },
  manageButton: {
    fontSize: 12,
    fontWeight: 600,
    color: '#2563eb',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    whiteSpace: 'nowrap',
  },
  devToolsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginBottom: 8,
  },
  devToolsBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  devToolsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  devToolsLabel: {
    fontSize: 12,
    color: '#555',
  },
  devToolsResult: {
    marginTop: 2,
    padding: '6px 10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 12,
    color: '#166534',
  },
};
