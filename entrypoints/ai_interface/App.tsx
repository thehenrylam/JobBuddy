import React, { useState, useRef, useEffect } from 'react';
import { createJobPost } from '../../services/llmJobPost';
import { savePost } from '../../services/savedPosts';
import DownloadBar from './DownloadBar';
import { showErrorToast, showInfoToast } from './toast';
import StatusBadge from './StatusBadge';
import PostDropdown from './PostDropdown';
import type { PostDropdownHandle } from './PostDropdown';
import { detectPageType } from '../../services/pageDetect';
import { detectSelectedText } from '../../services/textDetect';
import type { DetectionResult } from '../../lib/jobDetect/types';

const SELECTION_DEBOUNCE_MS = 750;

const baseStyle: React.CSSProperties = {
  width: '64px',
  height: '64px',
  border: 'none',
  borderRadius: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0',
  color: '#2563eb',
  flexShrink: 0,
  outline: 'none',
  transition: 'background 0.15s ease, transform 0.1s ease',
};

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={32} height={32}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export default function AiButton() {
  const [bg, setBg] = useState('rgba(37, 99, 235, 0.08)');
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [pageResult, setPageResult] = useState<DetectionResult | null>(null);
  const [selectionResult, setSelectionResult] = useState<DetectionResult | null>(null);
  const [selectionText, setSelectionText] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<PostDropdownHandle | null>(null);

  useEffect(() => {
    detectPageType().then(setPageResult).catch(() => {});
  }, []);

  useEffect(() => {
    const update = () => {
      const text = window.getSelection()?.toString().trim() ?? '';
      setSelectionText(text);
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      if (!text) {
        setSelectionResult(null);
      } else {
        selectionTimerRef.current = setTimeout(() => {
          setSelectionResult(detectSelectedText(text));
        }, SELECTION_DEBOUNCE_MS);
      }
    };
    document.addEventListener('selectionchange', update);
    return () => {
      document.removeEventListener('selectionchange', update);
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (isLoading) {
      abortRef.current?.abort();
      abortRef.current = null;
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    try {
      const post = await createJobPost({ signal: controller.signal, text: selectionText || undefined });
      await savePost(post);
      dropdownRef.current?.refresh();
      setSelectedPostId(post.id);
      showInfoToast('Post saved');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return; // user cancelled, no toast
      showErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }} onMouseDown={(e) => e.stopPropagation()}>
      {selectedPostId && <DownloadBar postId={selectedPostId} />}
      <PostDropdown ref={dropdownRef} selectedId={selectedPostId} onSelect={setSelectedPostId} />
      <div style={{ display: 'flex', alignItems: 'center', height: '86px', flexShrink: 0, padding: '0 10px', gap: 8 }}>
        <StatusBadge result={selectionResult ?? pageResult} isSelection={!!selectionResult} />
        <button
          style={{ ...baseStyle, background: bg, transform: `scale(${scale})`, flexShrink: 0 }}
          onMouseEnter={() => setBg('rgba(37, 99, 235, 0.16)')}
          onMouseLeave={() => { setBg('rgba(37, 99, 235, 0.08)'); setScale(1); }}
          onMouseDown={(e) => { e.stopPropagation(); setBg('rgba(37, 99, 235, 0.28)'); setScale(0.92); }}
          onMouseUp={() => { setBg('rgba(37, 99, 235, 0.16)'); setScale(1); }}
          onClick={handleClick}
        >
          {isLoading ? <SpinnerIcon /> : <StarIcon />}
        </button>
      </div>
    </div>
  );
}
