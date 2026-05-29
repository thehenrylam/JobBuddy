import React, { useState, useEffect } from 'react';
import { getResumeFile, getUserPromptFile, getAboutUser } from '../../services/aboutUser';

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
  const [aboutLabel, setAboutLabel] = useState<string | null>(null);
  const [aboutHasFiles, setAboutHasFiles] = useState(false);

  const loadAboutUser = () => {
    Promise.all([getResumeFile(), getUserPromptFile(), getAboutUser()]).then(([resume, userPrompt, aboutUser]) => {
      const hasFiles = !!(resume || userPrompt);
      setAboutHasFiles(hasFiles);
      if (!hasFiles) { setAboutLabel(null); return; }
      const filenames = [resume?.filename, userPrompt?.filename].filter(Boolean).join(', ');
      const name = aboutUser?.name;
      setAboutLabel(name ? `${name}${filenames ? ` · ${filenames}` : ''}` : filenames);
    }).catch(() => {});
  };

  useEffect(() => {
    browser.storage.local.get([STORAGE_KEY, 'llmConfig']).then((result) => {
      setIsActive(result[STORAGE_KEY] ?? false);
      setLLMConfig(result.llmConfig ?? null);
    });
    loadAboutUser();

    const onStorageChange = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      if ('resumeFile' in changes || 'userPromptFile' in changes || 'aboutUser' in changes) {
        loadAboutUser();
      }
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

      {aboutHasFiles ? (
        <div className="jb-clickable" style={{ ...styles.aboutActive, cursor: 'pointer' }} onClick={onAboutUser}>
          <span style={styles.aboutLabel}>{aboutLabel}</span>
        </div>
      ) : (
        <div className="jb-clickable" style={{ ...styles.aboutMissing, cursor: 'pointer' }} onClick={onAboutUser}>
          No Profile
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
  aboutMissing: {
    fontSize: 12,
    fontWeight: 500,
    color: '#9f1239',
    backgroundColor: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 6,
    padding: '8px 10px',
  },
  aboutActive: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    padding: '8px 10px',
    overflow: 'hidden',
  },
  aboutLabel: {
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
