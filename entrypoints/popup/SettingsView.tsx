import React, { useState, useEffect } from 'react';

type LlmType = 'api' | 'local';

interface LlmConfig {
  type: LlmType;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: LlmConfig = { type: 'api', baseUrl: '', apiKey: '', model: '' };
const LOCAL_DEFAULT_URL = 'http://localhost:1234/v1';
const API_DEFAULT_URL = 'https://api.openai.com/v1';
const DRAFT_KEY = 'llmConfigDraft';

function randomHex4(): string {
  return Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
}

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

export default function SettingsView({ onBack }: { onBack: () => void }) {
  const [savedConfig, setSavedConfig] = useState<LlmConfig | null>(null);
  const [editConfig, setEditConfig] = useState<LlmConfig>(DEFAULT_CONFIG);
  const [isEditing, setIsEditing] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [checkSuccess, setCheckSuccess] = useState(false);

  // Load saved config + any in-progress draft on mount
  useEffect(() => {
    browser.storage.local.get(['llmConfig', DRAFT_KEY]).then((result) => {
      const saved = result.llmConfig as LlmConfig | undefined;
      const draft = result[DRAFT_KEY] as LlmConfig | undefined;
      if (saved) {
        setSavedConfig(saved);
        if (draft) {
          // Resume the edit the user was mid-way through
          setEditConfig(draft);
          setIsEditing(true);
        } else {
          setIsEditing(false);
        }
      } else if (draft) {
        setEditConfig(draft);
      }
    });
  }, []);

  // Persist draft while editing so closing the popup doesn't lose progress
  useEffect(() => {
    if (!isEditing) return;
    browser.storage.local.set({ [DRAFT_KEY]: editConfig });
  }, [editConfig, isEditing]);

  const patch = (p: Partial<LlmConfig>) => setEditConfig((prev) => ({ ...prev, ...p }));

  const handleTypeChange = (type: LlmType) => {
    setEditConfig({ ...DEFAULT_CONFIG, type });
    setCheckError('');
    setCheckSuccess(false);
  };

  const handleEdit = () => {
    setEditConfig(savedConfig!);
    setIsEditing(true);
    setCheckError('');
    setCheckSuccess(false);
  };

  const handleClear = async () => {
    await browser.storage.local.remove(['llmConfig', DRAFT_KEY]);
    setSavedConfig(null);
    setEditConfig(DEFAULT_CONFIG);
    setIsEditing(true);
    setCheckError('');
    setCheckSuccess(false);
  };

  const performCheck = async (): Promise<void> => {
    const hex = randomHex4();
    const expected = `Hello World (${hex})`;
    const prompt = `Respond with this exact phrase: "${expected}"`;
    const baseUrl = editConfig.baseUrl || (editConfig.type === 'local' ? LOCAL_DEFAULT_URL : API_DEFAULT_URL);
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (editConfig.apiKey) headers['Authorization'] = `Bearer ${editConfig.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: editConfig.model || undefined,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      const reply: string = data.choices?.[0]?.message?.content?.trim() ?? '';

      if (reply !== expected) {
        throw new Error(`Invalid response.\n\nExpected: "${expected}"\nReceived: "${reply}"`);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out after 15 seconds.'
          : err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckError('');
    setCheckSuccess(false);
    try {
      await performCheck();
      setCheckSuccess(true);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    setChecking(true);
    setCheckError('');
    setCheckSuccess(false);
    try {
      await performCheck();
      await browser.storage.local.set({ llmConfig: editConfig });
      await browser.storage.local.remove(DRAFT_KEY);
      setSavedConfig(editConfig);
      setIsEditing(false);
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  const baseUrlPlaceholder = editConfig.type === 'local' ? LOCAL_DEFAULT_URL : API_DEFAULT_URL;
  const resolvedBaseUrl = savedConfig?.baseUrl || (savedConfig?.type === 'local' ? LOCAL_DEFAULT_URL : API_DEFAULT_URL);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button className="jb-btn-ghost" style={styles.backButton} onClick={onBack} title="Back">←</button>
        <span style={styles.title}>Settings</span>
      </div>

      <section>
        <p style={styles.sectionLabel}>LLM</p>

        {!isEditing && savedConfig ? (
          /* ── Saved config card ── */
          <div style={styles.configCard}>
            <div style={styles.configDetails}>
              <span style={styles.configBadge}>
                {savedConfig.type === 'local' ? 'Local' : 'API'}
              </span>
              <span style={styles.configUrl}>{resolvedBaseUrl}</span>
              {savedConfig.model && (
                <span style={styles.configModel}>{savedConfig.model}</span>
              )}
            </div>
            <div style={styles.configActions}>
              <button className="jb-btn-icon" style={styles.iconButton} onClick={handleEdit} title="Edit">
                <PencilIcon />
              </button>
              <button className="jb-btn-icon" style={{ ...styles.iconButton, ...styles.iconButtonDanger }} onClick={handleClear} title="Clear">
                <TrashIcon />
              </button>
            </div>
          </div>
        ) : (
          /* ── Edit form ── */
          <>
            <div style={styles.typeToggle}>
              <button
                className="jb-btn-toggle"
                style={{ ...styles.typeBtn, ...(editConfig.type === 'api' ? styles.typeBtnActive : {}) }}
                onClick={() => handleTypeChange('api')}
              >
                API
              </button>
              <button
                className="jb-btn-toggle"
                style={{ ...styles.typeBtn, ...(editConfig.type === 'local' ? styles.typeBtnActive : {}) }}
                onClick={() => handleTypeChange('local')}
              >
                Local
              </button>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Base URL</label>
              <input
                className="jb-input"
                style={styles.input}
                type="url"
                placeholder={baseUrlPlaceholder}
                value={editConfig.baseUrl}
                onChange={(e) => patch({ baseUrl: e.target.value })}
              />
              <span style={styles.hint}>
                {editConfig.type === 'local'
                  ? 'LM Studio: enable "OpenAI Compatible Server" → use http://localhost:1234/v1'
                  : '/chat/completions is appended automatically.'}
              </span>
            </div>

            {editConfig.type === 'api' && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>API Key</label>
                <input
                  className="jb-input"
                  style={styles.input}
                  type="password"
                  placeholder="sk-..."
                  value={editConfig.apiKey}
                  onChange={(e) => patch({ apiKey: e.target.value })}
                />
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Model</label>
              <input
                className="jb-input"
                style={styles.input}
                type="text"
                placeholder={editConfig.type === 'local' ? 'e.g. lmstudio-community/...' : 'e.g. gpt-4o'}
                value={editConfig.model}
                onChange={(e) => patch({ model: e.target.value })}
              />
            </div>

            <div style={styles.actionRow}>
              <button
                className="jb-btn"
                style={{ ...styles.checkButton, opacity: checking ? 0.6 : 1 }}
                onClick={handleCheck}
                disabled={checking}
              >
                {checking ? 'Checking...' : 'Check LLM'}
              </button>
              <button
                className="jb-btn"
                style={{ ...styles.saveButton, opacity: checking ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={checking}
              >
                {checking ? 'Saving...' : 'Save'}
              </button>
            </div>

            {checkSuccess && !checkError && (
              <div style={styles.successBox}>LLM responded correctly.</div>
            )}
            {checkError !== '' && (
              <div style={styles.errorBox}>{checkError}</div>
            )}
          </>
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
  // ── Saved config card ──
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
  // ── Edit form ──
  typeToggle: {
    display: 'flex',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid #ddd',
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    padding: '6px 0',
    background: '#f5f5f5',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#555',
  },
  typeBtnActive: {
    background: '#2563eb',
    color: '#fff',
    fontWeight: 600,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#555',
  },
  input: {
    padding: '6px 8px',
    fontSize: 12,
    border: '1px solid #ccc',
    borderRadius: 5,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: 10,
    color: '#999',
    lineHeight: 1.4,
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  checkButton: {
    flex: 1,
    padding: '8px 0',
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  saveButton: {
    flex: 1,
    padding: '8px 0',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  successBox: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 12,
    color: '#166534',
  },
  errorBox: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 6,
    fontSize: 12,
    color: '#9f1239',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
