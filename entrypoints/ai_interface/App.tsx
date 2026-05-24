import React, { useState, useRef } from 'react';
import { llmWebpageCategorize } from '../../services/llmWebpageCategorize';
import { showErrorToast } from './toast';

const baseStyle: React.CSSProperties = {
  width: '52px',
  height: '52px',
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
      strokeWidth={1.5} stroke="currentColor" width={28} height={28}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24" fill="none">
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
  const abortRef = useRef<AbortController | null>(null);

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
      await llmWebpageCategorize(controller.signal);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return; // user cancelled, no toast
      showErrorToast(err instanceof Error ? err.message : String(err));
    } finally {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <button
      style={{ ...baseStyle, background: bg, transform: `scale(${scale})` }}
      onMouseEnter={() => setBg('rgba(37, 99, 235, 0.16)')}
      onMouseLeave={() => { setBg('rgba(37, 99, 235, 0.08)'); setScale(1); }}
      onMouseDown={(e) => { e.stopPropagation(); setBg('rgba(37, 99, 235, 0.28)'); setScale(0.92); }}
      onMouseUp={() => { setBg('rgba(37, 99, 235, 0.16)'); setScale(1); }}
      onClick={handleClick}
    >
      {isLoading ? <SpinnerIcon /> : <StarIcon />}
    </button>
  );
}
