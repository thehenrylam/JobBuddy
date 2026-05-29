import React, { useState, useEffect } from 'react';
import { getResumeFile, getUserPromptFile, getAboutUser, getParseStatus } from '../../services/aboutUser';
import type { ResumeFile, UserPromptFile, AboutUser, ParseStatus } from '../../lib/aboutUser/types';

const VERSION = browser.runtime.getManifest().version;
const STORAGE_KEY = 'floatingButtonVisible';

function inferProvider(config: { type: string; baseUrl: string }): string {
  if (config.type === 'local') return 'Local';
  const url = config.baseUrl.toLowerCase();
  if (url.includes('openai.com')) return 'OpenAI';
  if (url.includes('anthropic.com')) return 'Anthropic';
  if (url.includes('googleapis.com') || url.includes('google.com')) return 'Google';
  if (url.includes('groq.com')) return 'Groq';
  if (url.includes('together.ai')) return 'Together AI';
  if (url.includes('mistral.ai')) return 'Mistral';
  return 'API';
}

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={16} height={16}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export default function MainView({ onSettings, onLlmSettings, onAboutUser }: { onSettings: () => void; onLlmSettings: () => void; onAboutUser: () => void }) {
  const [isActive, setIsActive] = useState(false);
  const [llmConfig, setLLMConfig] = useState<{ type: string; baseUrl: string; model: string } | null>(null);
  const [resume, setResume] = useState<ResumeFile | null>(null);
  const [userPrompt, setUserPrompt] = useState<UserPromptFile | null>(null);
  const [aboutUser, setAboutUser] = useState<AboutUser | null>(null);
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEY, 'llmConfig']).then((result) => {
      setIsActive(result[STORAGE_KEY] ?? false);
      setLLMConfig(result.llmConfig ?? null);
    });

    Promise.all([getResumeFile(), getUserPromptFile(), getAboutUser(), getParseStatus()]).then(([r, u, a, ps]) => {
      setResume(r);
      setUserPrompt(u);
      setAboutUser(a);
      setParseStatus(ps ?? 'idle');
    }).catch(() => {});

    const onStorageChange = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      if ('resumeFile' in changes) setResume((changes.resumeFile.newValue ?? null) as ResumeFile | null);
      if ('userPromptFile' in changes) setUserPrompt((changes.userPromptFile.newValue ?? null) as UserPromptFile | null);
      if ('aboutUser' in changes) setAboutUser((changes.aboutUser.newValue ?? null) as AboutUser | null);
      if ('aboutUserParseStatus' in changes) setParseStatus((changes.aboutUserParseStatus.newValue ?? 'idle') as ParseStatus);
    };
    browser.storage.onChanged.addListener(onStorageChange);
    return () => browser.storage.onChanged.removeListener(onStorageChange);
  }, []);

  const handleActivate = async () => {
    const next = !isActive;
    await browser.storage.local.set({ [STORAGE_KEY]: next });
    setIsActive(next);
  };

  const hasLlm = llmConfig != null;
  const provider = hasLlm ? inferProvider(llmConfig) : null;

  // ── About User badge state ────────────────────────────────────────────────────

  const hasSources = !!(resume && userPrompt);
  const isProcessing = parseStatus === 'waiting' || parseStatus === 'working';
  const isParsed = !!aboutUser;

  const filenames = [resume?.filename, userPrompt?.filename].filter(Boolean).join(', ');
  const displayName = aboutUser
    ? [aboutUser.preferred_first_name ?? aboutUser.first_name, aboutUser.preferred_last_name ?? aboutUser.last_name]
        .filter(Boolean).join(' ') || null
    : null;
  const parsedLabel = displayName
    ? `${displayName}${filenames ? ` · ${filenames}` : ''}`
    : filenames;

  type BadgeVariant = 'missing' | 'unparsed' | 'processing' | 'parsed';
  const badgeVariant: BadgeVariant =
    !hasSources ? 'missing' :
    isProcessing ? 'processing' :
    !isParsed    ? 'unparsed'   :
                   'parsed';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.name}>JobBuddy</span>
        <span style={styles.version}>v{VERSION}</span>
      </header>

      {hasLlm ? (
        <div className="jb-clickable" style={{ ...styles.llmActive, cursor: 'pointer' }} onClick={onLlmSettings}>
          <span style={styles.llmProvider}>{provider}</span>
          <span style={styles.llmModel}>{llmConfig.model || '(no model)'}</span>
        </div>
      ) : (
        <div className="jb-clickable" style={{ ...styles.llmMissing, cursor: 'pointer' }} onClick={onLlmSettings}>
          No LLM Selected
        </div>
      )}

      {/* About User badge — 4 states */}
      {badgeVariant === 'missing' && (
        <div className="jb-clickable" style={{ ...styles.aboutMissing, cursor: 'pointer' }} onClick={onAboutUser}>
          No Profile — Add resume or prompt
        </div>
      )}

      {badgeVariant === 'unparsed' && (
        <div className="jb-clickable" style={{ ...styles.aboutUnparsed, cursor: 'pointer' }} onClick={onAboutUser}>
          <span style={styles.aboutUnparsedFiles}>{filenames}</span>
          <span style={styles.aboutUnparsedTag}>Not parsed</span>
        </div>
      )}

      {badgeVariant === 'processing' && (
        <div
          className="jb-clickable jb-about-processing"
          style={styles.aboutProcessing}
          onClick={onAboutUser}
        >
          <span style={styles.aboutProcessingDot} />
          <span style={styles.aboutProcessingText}>
            {parseStatus === 'waiting' ? 'Waiting to parse…' : 'Parsing profile…'}
          </span>
        </div>
      )}

      {badgeVariant === 'parsed' && (
        <div className="jb-clickable" style={{ ...styles.aboutParsed, cursor: 'pointer' }} onClick={onAboutUser}>
          <span style={styles.aboutParsedLabel}>{parsedLabel}</span>
        </div>
      )}

      <div style={styles.buttonRow}>
        <button
          className="jb-btn"
          style={{ ...styles.activateButton, background: isActive ? '#dc2626' : '#2563eb' }}
          onClick={handleActivate}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button className="jb-btn-icon" style={styles.settingsButton} title="Settings" onClick={onSettings}>
          <GearIcon />
        </button>
      </div>
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
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: 600,
  },
  version: {
    fontSize: 11,
    color: '#aaa',
  },
  llmMissing: {
    fontSize: 12,
    fontWeight: 500,
    color: '#9f1239',
    backgroundColor: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 6,
    padding: '8px 10px',
  },
  llmActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    padding: '8px 10px',
    overflow: 'hidden',
  },
  llmProvider: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1d4ed8',
    flexShrink: 0,
  },
  llmModel: {
    fontSize: 12,
    color: '#1d4ed8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Red — no sources at all
  aboutMissing: {
    fontSize: 12,
    fontWeight: 500,
    color: '#9f1239',
    backgroundColor: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 6,
    padding: '8px 10px',
  },
  // Yellow — sources present but not yet parsed
  aboutUnparsed: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: 6,
    padding: '8px 10px',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  aboutUnparsedFiles: {
    fontSize: 12,
    color: '#92400e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  aboutUnparsedTag: {
    fontSize: 10,
    fontWeight: 600,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: 4,
    padding: '1px 5px',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  // Blue pulsing — waiting/working (colors driven by .jb-about-processing CSS)
  aboutProcessing: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: '8px 10px',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  aboutProcessingDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    flexShrink: 0,
  },
  aboutProcessingText: {
    fontSize: 12,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  // Green — parsed and ready
  aboutParsed: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    padding: '8px 10px',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  aboutParsedLabel: {
    fontSize: 12,
    color: '#166534',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
  },
  activateButton: {
    flex: 1,
    height: 36,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  settingsButton: {
    width: 36,
    height: 36,
    background: '#f0f0f0',
    color: '#444',
    border: '1px solid #ddd',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
