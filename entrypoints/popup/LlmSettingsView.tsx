import React, { useState, useEffect, useRef } from 'react';
import { type LlmType, type LLMConfig, callLLMWithConfig } from '../../services/llm';

const LOCAL_DEFAULT_URL = 'http://localhost:1234/v1';
const API_DEFAULT_URL = 'https://api.openai.com/v1';

const DEFAULT_CONFIG: LLMConfig = { type: 'api', baseUrl: '', apiKey: '', model: '' };
const DRAFT_KEY = 'llmConfigDraft';

function randomHex4(): string {
  return Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
}

export default function LlmSettingsView({ onBack }: { onBack: () => void }) {
  const [editConfig, setEditConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [checkSuccess, setCheckSuccess] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    browser.storage.local.get(['llmConfig', DRAFT_KEY]).then((result) => {
      loadedRef.current = true;
      const saved = result.llmConfig as LLMConfig | undefined;
      const draft = result[DRAFT_KEY] as LLMConfig | undefined;
      if (draft) {
        setEditConfig(draft);
      } else if (saved) {
        setEditConfig(saved);
      }
    });
  }, []);

  // Persist draft on every change, but only after initial load to avoid writing DEFAULT_CONFIG
  useEffect(() => {
    if (!loadedRef.current) return;
    browser.storage.local.set({ [DRAFT_KEY]: editConfig });
  }, [editConfig]);

  const patch = (p: Partial<LLMConfig>) => setEditConfig(prev => ({ ...prev, ...p }));

  const handleTypeChange = (type: LlmType) => {
    setEditConfig({ ...DEFAULT_CONFIG, type });
    setCheckError('');
    setCheckSuccess(false);
  };

  const performCheck = async (): Promise<void> => {
    const hex = randomHex4();
    const expected = `Hello World (${hex})`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const reply = await callLLMWithConfig(editConfig, {
        prompt: `Respond with this exact phrase: "${expected}"`,
        max_tokens: 50,
        temperature: 0,
        signal: controller.signal,
      });
      if (reply.trim() !== expected) {
        throw new Error(`Invalid response.\n\nExpected: "${expected}"\nReceived: "${reply.trim()}"`);
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
      onBack();
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  const baseUrlPlaceholder = editConfig.type === 'local' ? LOCAL_DEFAULT_URL : API_DEFAULT_URL;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button className="jb-btn-ghost" style={styles.backButton} onClick={onBack} title="Back">←</button>
        <span style={styles.title}>LLM Settings</span>
      </div>

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
  typeToggle: {
    display: 'flex',
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid #ddd',
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
    padding: '8px 10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 12,
    color: '#166534',
  },
  errorBox: {
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
