import React, { useState, useEffect } from 'react';
import {
  getResumeFile,
  clearResumeFile,
  getUserPromptFile,
  resetUserPromptToDefault,
  getAboutUser,
  getSourceHash,
  getParseStatus,
  computeHash,
} from '../../services/aboutUser';
import type { ResumeFile, UserPromptFile, AboutUser, AboutUserStatus, SourceHash, ParseStatus } from '../../lib/aboutUser/types';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={14} height={14}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={14} height={14}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={16} height={16}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={16} height={16}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M5 3h14M5 21h14M6 3v4l6 5-6 5v4M18 3v4l-6 5 6 5v4" />
    </svg>
  );
}

function ParseSpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function StatusDot({ status }: { status: AboutUserStatus }) {
  const colors: Record<AboutUserStatus, string> = {
    critical: '#dc2626',
    caution: '#d97706',
    okay: '#16a34a',
    working: '#2563eb',
    waiting: '#9ca3af',
  };
  const labels: Record<AboutUserStatus, string> = {
    critical: 'No sources',
    caution: 'Incomplete',
    okay: 'Ready',
    working: 'Parsing…',
    waiting: 'Waiting…',
  };
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colors[status], flexShrink: 0,
        boxShadow: status === 'working' ? `0 0 0 2px ${colors[status]}40` : undefined,
      }} />
      <span style={{ fontSize: 11, color: colors[status], fontWeight: 600 }}>{labels[status]}</span>
    </span>
  );
}

function deriveStatus(
  parseStatus: ParseStatus,
  resume: ResumeFile | null,
  userPrompt: UserPromptFile | null,
  aboutUser: AboutUser | null,
): AboutUserStatus {
  if (parseStatus === 'working') return 'working';
  if (parseStatus === 'waiting') return 'waiting';
  if (!resume || !userPrompt) return 'critical';
  if (!aboutUser || (!aboutUser.first_name && !aboutUser.last_name && aboutUser.skills.length === 0)) return 'caution';
  return 'okay';
}

export default function AboutUserSettingsView({ onBack }: { onBack: () => void }) {
  const [resume, setResume] = useState<ResumeFile | null>(null);
  const [userPrompt, setUserPrompt] = useState<UserPromptFile | null>(null);
  const [aboutUser, setAboutUser] = useState<AboutUser | null>(null);
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Hashes of what was used for the last successful LLM parse.
  const [sourceHash, setSourceHash] = useState<SourceHash | null>(null);
  // Hashes of the currently-loaded files (updated whenever files change).
  const [currentResumeHash, setCurrentResumeHash] = useState<string | null>(null);
  const [currentPromptHash, setCurrentPromptHash] = useState<string | null>(null);

  const setResumeSync = (r: ResumeFile | null) => {
    setResume(r);
    setCurrentResumeHash(r ? computeHash(r.base64) : null);
  };
  const setUserPromptSync = (u: UserPromptFile | null) => {
    setUserPrompt(u);
    setCurrentPromptHash(u ? computeHash(u.content) : null);
  };

  // ─── effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial load
    Promise.all([getResumeFile(), getUserPromptFile(), getAboutUser(), getSourceHash(), getParseStatus()])
      .then(([r, u, a, h, ps]) => {
        setResumeSync(r);
        setUserPromptSync(u);
        setAboutUser(a);
        setSourceHash(h);
        setParseStatus(ps ?? 'idle');
      });

    // Mirror storage changes made by the background script.
    const onStorageChange = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      if ('resumeFile' in changes) {
        setResumeSync((changes.resumeFile.newValue ?? null) as ResumeFile | null);
      }
      if ('userPromptFile' in changes) {
        setUserPromptSync((changes.userPromptFile.newValue ?? null) as UserPromptFile | null);
      }
      if ('aboutUser' in changes) {
        setAboutUser((changes.aboutUser.newValue ?? null) as AboutUser | null);
      }
      if ('aboutUserSourceHash' in changes) {
        setSourceHash((changes.aboutUserSourceHash.newValue ?? null) as SourceHash | null);
      }
      if ('aboutUserParseStatus' in changes) {
        setParseStatus((changes.aboutUserParseStatus.newValue ?? 'idle') as ParseStatus);
      }
    };

    browser.storage.onChanged.addListener(onStorageChange);
    return () => browser.storage.onChanged.removeListener(onStorageChange);
  }, []);

  // ─── upload handlers ──────────────────────────────────────────────────────────
  // Open a small dedicated window for file picking.  A windows.create popup is a
  // real browser window (not a browser action panel) so it does not close when
  // the OS file dialog appears, and the file input click is a genuine user gesture.

  const openPickerWindow = (fileType: 'resume' | 'prompt') => {
    setError(null);
    const hash = fileType === 'resume' ? '#pick-resume' : '#pick-prompt';
    browser.windows.create({
      url: browser.runtime.getURL('popup.html') + hash,
      type: 'popup',
      width: 300,
      height: 220,
    }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  const handleResumePickerOpen = () => openPickerWindow('resume');
  const handlePromptPickerOpen = () => openPickerWindow('prompt');

  // ─── other handlers ──────────────────────────────────────────────────────────

  const handleResumeDownload = () => {
    if (!resume) return;
    const bytes = Uint8Array.from(atob(resume.base64), c => c.charCodeAt(0));
    downloadBlob(new Blob([bytes], { type: resume.mimeType || 'application/octet-stream' }), resume.filename);
  };

  const handleResumeClear = async () => {
    await clearResumeFile();
    setResumeSync(null);
    // Background handles cache invalidation and parse cancellation via storage.onChanged.
  };

  const handlePromptDownload = () => {
    if (!userPrompt) return;
    downloadBlob(new Blob([userPrompt.content], { type: 'text/markdown' }), userPrompt.filename);
  };

  const handleResetToDefault = async () => {
    await resetUserPromptToDefault();
    // Background handles invalidation and scheduling via storage.onChanged.
  };

  const handleReparseOrCancel = () => {
    if (parseStatus === 'waiting' || parseStatus === 'working') {
      browser.runtime.sendMessage({ type: 'JB_PARSE_CANCEL' }).catch(console.error);
    } else {
      browser.runtime.sendMessage({ type: 'JB_PARSE_NOW' }).catch(console.error);
    }
  };

  const status = deriveStatus(parseStatus, resume, userPrompt, aboutUser);

  // Card color coding: green = parsed with current sources, blue = has data but stale/unparsed
  const resumeIsFresh = resume !== null && aboutUser !== null
    && currentResumeHash !== null && currentResumeHash === sourceHash?.resumeHash;
  const promptIsFresh = userPrompt !== null && aboutUser !== null
    && currentPromptHash !== null && currentPromptHash === sourceHash?.promptHash;
  const aboutUserIsCurrent = aboutUser !== null
    && (!resume || resumeIsFresh) && (!userPrompt || promptIsFresh);

  const resumeCardColor: 'default' | 'blue' | 'green' =
    !resume ? 'default' : resumeIsFresh ? 'green' : 'blue';
  const promptCardColor: 'default' | 'blue' | 'green' =
    !userPrompt ? 'default' : promptIsFresh ? 'green' : 'blue';
  const aboutUserCardColor: 'default' | 'blue' | 'green' =
    !aboutUser ? 'default' : aboutUserIsCurrent ? 'green' : 'blue';

  const cardColorStyle = (c: 'default' | 'blue' | 'green'): React.CSSProperties => {
    if (c === 'blue') return { background: '#eff6ff', borderColor: '#bfdbfe' };
    if (c === 'green') return { background: '#f0fdf4', borderColor: '#bbf7d0' };
    return {};
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button className="jb-btn-ghost" style={styles.backButton} onClick={onBack}>←</button>
        <span style={styles.title}>About Me</span>
        <StatusDot status={status} />
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Resume section */}
      <section>
        <p style={styles.sectionLabel}>Resume</p>
        <div style={{ ...styles.card, ...cardColorStyle(resumeCardColor) }}>
          {resume ? (
            <div style={styles.fileRow}>
              <span style={styles.filename}>{resume.filename}</span>
              <div style={styles.actions}>
                <button className="jb-btn-icon" style={styles.iconBtn} onClick={handleResumeDownload} title="Download">
                  <DownloadIcon />
                </button>
                <button className="jb-btn-icon" style={{ ...styles.iconBtn, ...styles.iconBtnDanger }} onClick={handleResumeClear} title="Remove">
                  <TrashIcon />
                </button>
              </div>
            </div>
          ) : (
            <span style={styles.emptyText}>No resume uploaded</span>
          )}
          <button type="button" className="jb-btn" style={styles.uploadBtn} onClick={handleResumePickerOpen}>
            {resume ? 'Replace' : 'Upload'}
          </button>
        </div>
      </section>

      {/* User Prompt section */}
      <section>
        <p style={styles.sectionLabel}>User Prompt</p>
        <div style={{ ...styles.card, ...cardColorStyle(promptCardColor) }}>
          {userPrompt ? (
            <>
              <div style={styles.fileRow}>
                <span style={styles.filename}>{userPrompt.filename}</span>
                <div style={styles.actions}>
                  <button className="jb-btn-icon" style={styles.iconBtn} onClick={handlePromptDownload} title="Download">
                    <DownloadIcon />
                  </button>
                </div>
              </div>
              <pre style={{
                ...styles.promptPreview,
                maxHeight: promptExpanded ? 200 : 60,
                overflow: promptExpanded ? 'auto' : 'hidden',
              }}>
                {promptExpanded ? userPrompt.content : userPrompt.content.split('\n').slice(0, 4).join('\n')}
              </pre>
              <button
                type="button"
                className="jb-btn-ghost"
                style={styles.showMoreBtn}
                onClick={() => setPromptExpanded(e => !e)}
              >
                {promptExpanded ? 'Show less ▲' : 'Show more ▼'}
              </button>
            </>
          ) : (
            <span style={styles.emptyText}>No user prompt uploaded</span>
          )}
          <div style={styles.promptActions}>
            <button type="button" className="jb-btn" style={styles.uploadBtn} onClick={handlePromptPickerOpen}>
              {userPrompt ? 'Replace' : 'Upload .md'}
            </button>
            <button type="button" className="jb-btn-ghost" style={styles.resetBtn} onClick={handleResetToDefault}>
              Reset to Default
            </button>
          </div>
        </div>
      </section>

      {/* About User preview section */}
      <section>
        <div style={styles.previewHeader}>
          <p style={{ ...styles.sectionLabel, margin: 0 }}>About User</p>
          {(() => {
            const isActive = parseStatus === 'waiting' || parseStatus === 'working';
            const isDisabled = parseStatus === 'idle' && !(resume && userPrompt);
            return (
              <button
                className="jb-btn-icon"
                title={parseStatus === 'waiting' ? 'Cancel waiting' : parseStatus === 'working' ? 'Cancel parsing' : 'Parse profile'}
                style={{
                  ...styles.parseBtn,
                  color: isActive ? '#dc2626' : '#2563eb',
                  opacity: isDisabled ? 0.35 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
                onClick={handleReparseOrCancel}
                disabled={isDisabled}
              >
                {parseStatus === 'waiting' ? <HourglassIcon /> : parseStatus === 'working' ? <ParseSpinnerIcon /> : <SparkleIcon />}
              </button>
            );
          })()}
        </div>
        <div style={{ ...styles.card, ...cardColorStyle(aboutUserCardColor) }}>
          {aboutUser ? (() => {
              const displayName = [
                aboutUser.preferred_first_name ?? aboutUser.first_name,
                aboutUser.preferred_last_name ?? aboutUser.last_name,
              ].filter(Boolean).join(' ');
              const location = [
                aboutUser.city_of_residence,
                aboutUser.state_of_residence,
                aboutUser.country_of_residence,
              ].filter(Boolean).join(', ');
              return (
            <div style={styles.profilePreview}>
              {displayName && <div style={styles.profileName}>{displayName}</div>}
              {aboutUser.email_address && <div style={styles.profileDetail}>{aboutUser.email_address}</div>}
              {location && <div style={styles.profileDetail}>{location}</div>}
              {aboutUser.skills.length > 0 && (
                <div style={styles.profileDetail}>
                  <span style={styles.fieldLabel}>Skills: </span>
                  {aboutUser.skills.slice(0, 6).join(', ')}{aboutUser.skills.length > 6 ? '…' : ''}
                </div>
              )}
              {aboutUser.experience.length > 0 && (
                <div style={styles.profileDetail}>
                  <span style={styles.fieldLabel}>Experience: </span>
                  {aboutUser.experience.length} position{aboutUser.experience.length !== 1 ? 's' : ''}
                </div>
              )}
              {aboutUser.education.length > 0 && (
                <div style={styles.profileDetail}>
                  <span style={styles.fieldLabel}>Education: </span>
                  {aboutUser.education.length} entr{aboutUser.education.length !== 1 ? 'ies' : 'y'}
                </div>
              )}
            </div>
              );
            })() : (
            <span style={styles.emptyText}>Not yet parsed</span>
          )}
        </div>
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
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    padding: '10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    background: '#fafafa',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filename: {
    fontSize: 11,
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 5,
    cursor: 'pointer',
    color: '#555',
  },
  iconBtnDanger: {
    color: '#dc2626',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
  },
  uploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    height: 28,
    fontSize: 11,
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 5,
    cursor: 'pointer',
    padding: '0 10px',
    alignSelf: 'flex-start',
    boxSizing: 'border-box' as const,
  },
  promptActions: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  resetBtn: {
    fontSize: 11,
    fontWeight: 500,
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 4px',
  },
  showMoreBtn: {
    alignSelf: 'flex-start' as const,
    fontSize: 10,
    fontWeight: 500,
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 2px',
    marginTop: -2,
  },
  promptPreview: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    margin: 0,
    padding: '6px 8px',
    background: '#f5f5f5',
    borderRadius: 4,
    overflow: 'hidden',
    maxHeight: 60,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  emptyText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  parseBtn: {
    width: 28,
    height: 28,
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
  },
  profilePreview: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
  },
  profileName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#111827',
  },
  profileDetail: {
    fontSize: 11,
    color: '#374151',
  },
  fieldLabel: {
    fontWeight: 600,
    color: '#6b7280',
  },
  errorBox: {
    fontSize: 11,
    color: '#dc2626',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 6,
    padding: '6px 10px',
  },
};
