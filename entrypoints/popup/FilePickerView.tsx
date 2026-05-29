import React, { useState, useRef } from 'react';
import { saveResumeFile, saveUserPromptFile } from '../../services/aboutUser';
import { extractText } from '../../services/fileExtract';

type FileType = 'resume' | 'prompt';
type Status = 'idle' | 'dragging' | 'processing' | 'done' | 'error';

const ACCEPT_EXTS: Record<FileType, string[]> = {
  resume: ['.pdf', '.docx', '.doc', '.txt', '.md', '.rtf'],
  prompt: ['.md', '.txt'],
};

const ACCEPT_ATTR: Record<FileType, string> = {
  resume: '.pdf,.docx,.doc,.txt,.md,.rtf',
  prompt: '.md,.txt',
};

const TITLE: Record<FileType, string> = {
  resume: 'Upload Resume',
  prompt: 'Upload User Prompt',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeName(raw: string): string {
  return raw
    .replace(/[/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 200)
    .trim() || 'file';
}

function UploadIcon({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke={color} width={size} height={size} style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export default function FilePickerView({ fileType }: { fileType: FileType }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const dragCounter = useRef(0);

  const processFile = async (file: File) => {
    setStatus('processing');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10 MB)');

      const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
      if (!ACCEPT_EXTS[fileType].includes(ext)) {
        throw new Error(`Unsupported type "${ext}". Allowed: ${ACCEPT_EXTS[fileType].join(', ')}`);
      }

      const safeName = sanitizeName(file.name);

      if (fileType === 'resume') {
        const [base64, text] = await Promise.all([fileToBase64(file), extractText(file)]);
        await saveResumeFile({ filename: safeName, mimeType: file.type || 'application/octet-stream', base64, text });
      } else {
        const content = await file.text();
        await saveUserPromptFile({ filename: safeName, content });
      }

      setStatus('done');
      setTimeout(() => window.close(), 700);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (status === 'idle') setStatus('dragging');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setStatus('idle');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
    else setStatus('idle');
  };

  // ── zone appearance ──────────────────────────────────────────────────────────

  const isDragging = status === 'dragging';
  const isInteractive = status === 'idle' || status === 'dragging';

  const zoneColors = (() => {
    if (isDragging)                      return { borderColor: '#2563eb', bg: '#eff6ff' };
    if (isPressed && status === 'idle')  return { borderColor: '#3b82f6', bg: '#dbeafe' };
    if (isHovered && status === 'idle')  return { borderColor: '#93c5fd', bg: '#f0f9ff' };
    return { borderColor: '#d1d5db', bg: '#fafafa' };
  })();

  const iconColor = (() => {
    if (isDragging)                      return '#2563eb';
    if (isPressed && status === 'idle')  return '#2563eb';
    if (isHovered && status === 'idle')  return '#60a5fa';
    return '#9ca3af';
  })();

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div
      style={styles.outer}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/*
        The zone is a <label> so clicking anywhere inside it activates the hidden
        file input — Firefox requires the click to land on the input itself, and
        the input overlay covering the whole zone satisfies that.
        Hover/active effects are driven by React state (no CSS pseudo-classes
        needed) so they work with inline styles.
      */}
      <label
        style={{
          ...styles.zone,
          borderColor: zoneColors.borderColor,
          background: zoneColors.bg,
          cursor: isInteractive ? 'pointer' : 'default',
          transform: isPressed && status === 'idle' ? 'scale(0.985)' : 'scale(1)',
        }}
        onMouseEnter={() => { if (status === 'idle') setIsHovered(true); }}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
        onMouseDown={() => { if (status === 'idle') setIsPressed(true); }}
        onMouseUp={() => setIsPressed(false)}
      >
        {/* Full-zone invisible input — only present when clickable */}
        {isInteractive && (
          <input
            type="file"
            accept={ACCEPT_ATTR[fileType]}
            onChange={handleInputChange}
            style={styles.inputOverlay}
          />
        )}

        {isInteractive && (
          <>
            <UploadIcon size={34} color={iconColor} />
            <p style={{ ...styles.heading, color: isDragging ? '#1d4ed8' : '#111827' }}>
              {isDragging ? 'Release to upload' : TITLE[fileType]}
            </p>
            {!isDragging && (
              <>
                <p style={styles.sub}>Click or drag & drop to upload</p>
                <p style={styles.hint}>{ACCEPT_EXTS[fileType].join('  ')}</p>
              </>
            )}
          </>
        )}

        {status === 'processing' && (
          <>
            <UploadIcon size={34} color="#9ca3af" />
            <p style={styles.heading}>Processing…</p>
          </>
        )}

        {status === 'done' && (
          <p style={{ ...styles.heading, color: '#16a34a' }}>✓ Saved!</p>
        )}

        {status === 'error' && (
          <>
            <p style={{ ...styles.heading, color: '#dc2626' }}>Upload failed</p>
            <p style={styles.errMsg}>{errorMsg}</p>
            <button
              style={styles.retryBtn}
              onClick={(e) => {
                e.preventDefault();
                setStatus('idle');
                setErrorMsg('');
              }}
            >
              Try again
            </button>
          </>
        )}
      </label>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outer: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    padding: '1em',
    boxSizing: 'border-box',
    display: 'flex',
    fontFamily: 'sans-serif',
    background: '#fff',
  },
  zone: {
    flex: 1,
    position: 'relative' as const,
    border: '2px dashed',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    transition: 'border-color 0.12s, background 0.12s, transform 0.08s',
    overflow: 'hidden',
    minHeight: 0,
    userSelect: 'none' as const,
  },
  // Covers the entire zone so every click lands on the file input itself.
  inputOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  heading: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'center' as const,
    pointerEvents: 'none' as const,
  },
  sub: {
    margin: 0,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center' as const,
    pointerEvents: 'none' as const,
  },
  hint: {
    margin: 0,
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center' as const,
    letterSpacing: '0.03em',
    pointerEvents: 'none' as const,
  },
  errMsg: {
    margin: 0,
    fontSize: 11,
    color: '#dc2626',
    textAlign: 'center' as const,
    maxWidth: '90%',
    wordBreak: 'break-word' as const,
  },
  retryBtn: {
    marginTop: 4,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#2563eb',
    background: 'none',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
