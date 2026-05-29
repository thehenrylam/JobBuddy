import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { getSavedPosts } from '../../services/savedPosts';
import type { JobPost } from '../../lib/jobPost/types';

export interface PostDropdownHandle {
  refresh: () => void;
}

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function matchesQuery(post: JobPost, query: string): boolean {
  const q = query.toLowerCase();
  return (
    post.name.toLowerCase().includes(q) ||
    post.job_title.toLowerCase().includes(q) ||
    post.company.toLowerCase().includes(q)
  );
}

// ── Download helpers ──────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 _]/g, '').trim()
    .replace(/[ _]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function buildMarkdown(post: JobPost): string {
  const payRange =
    post.pay_range[0] !== null || post.pay_range[1] !== null
      ? `[${post.pay_range[0] ?? 'null'}, ${post.pay_range[1] ?? 'null'}]`
      : 'NULL';
  const keywords = post.keywords.length > 0 ? post.keywords.join(', ') : 'NULL';
  return [
    `# ${post.job_title}`, '',
    `job_title: "${post.job_title}"`,
    `company: "${post.company}"`,
    `job_type: ${post.job_type}`,
    `location: "${post.location}"`,
    `pay_range: ${payRange}`,
    `date: ${post.date}`,
    `keywords: ${keywords}`, '',
    '---', '',
    post.post_data,
  ].join('\n');
}

function buildFilename(post: JobPost): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${slugify(post.job_title)}_${slugify(post.company)}_${post.id.slice(-5)}_${ts}.md`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2.5} stroke="currentColor" width={11} height={11}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2.5} stroke="currentColor" width={10} height={10}
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" width={13} height={13}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 34;
const MAX_VISIBLE = 6;

const PostDropdown = forwardRef<PostDropdownHandle, Props>(({ selectedId, onSelect }, ref) => {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [popupRect, setPopupRect] = useState<{ bottom: number; left: number; width: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = () => getSavedPosts().then(setPosts).catch(() => {});
  useEffect(() => { load(); }, []);
  useImperativeHandle(ref, () => ({ refresh: load }));

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setHoveredId(null);
  }, []);

  const openPopup = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPopupRect({
      bottom: window.innerHeight - r.bottom - 6,
      left: r.left,
      width: r.width,
    });
    setIsOpen(true);
    // Focus search input after render
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  // Close on outside mousedown (capture phase catches it before any stopPropagation)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !popupRef.current?.contains(t)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [isOpen, close]);

  const filtered = query ? posts.filter((p) => matchesQuery(p, query)) : posts;
  const selectedPost = selectedId ? posts.find((p) => p.id === selectedId) ?? null : null;

  const handleSelect = (id: string | null) => {
    onSelect(id);
    close();
  };

  const handleDownload = async () => {
    if (!selectedPost) return;
    const blob = new Blob([buildMarkdown(selectedPost)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: buildFilename(selectedPost) });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Portal popup ──────────────────────────────────────────────────────────
  const popup =
    isOpen && popupRect
      ? ReactDOM.createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              bottom: popupRect.bottom,
              left: popupRect.left,
              width: popupRect.width,
              zIndex: 2147483647,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
              colorScheme: 'light',
              overflow: 'hidden',
              fontFamily: 'sans-serif',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* List — grows upward (sits above the search row) */}
            <div style={{ overflowY: 'auto', maxHeight: MAX_VISIBLE * ITEM_HEIGHT }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                  No posts found
                </div>
              ) : (
                filtered.map((post) => (
                  <div
                    key={post.id}
                    style={itemStyle(post.id === selectedId, hoveredId === post.id)}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(post.id); }}
                    onMouseEnter={() => setHoveredId(post.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <span style={{
                      fontSize: 11,
                      color: '#374151',
                      fontFamily: 'sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {post.name}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Search + None row — at the bottom, aligned over the trigger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderTop: '1px solid #e5e7eb', boxSizing: 'border-box' }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: '#ffffff',
                border: '1px solid #2563eb',
                boxShadow: '0 0 0 2px rgba(37,99,235,0.15)',
                borderRadius: 6,
                height: 28,
                padding: '0 8px',
                boxSizing: 'border-box',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', flexShrink: 0 }}>
                  <SearchIcon />
                </span>
                <input
                  ref={searchInputRef}
                  style={{
                    flex: 1,
                    height: '100%',
                    fontSize: 11,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontFamily: 'sans-serif',
                    color: '#374151',
                    minWidth: 0,
                    padding: 0,
                  }}
                  placeholder="Filter posts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                style={{
                  flexShrink: 0,
                  height: 28,
                  padding: '0 10px',
                  fontSize: 11,
                  fontFamily: 'sans-serif',
                  background: selectedId === null ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${selectedId === null ? '#93c5fd' : '#d1d5db'}`,
                  borderRadius: 6,
                  color: selectedId === null ? '#1d4ed8' : '#6b7280',
                  cursor: 'pointer',
                  fontStyle: 'italic',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                }}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
              >
                — None
              </button>
            </div>
          </div>,
          document.documentElement,
        )
      : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 8px 4px',
      boxSizing: 'border-box',
    }}>
      {/* Trigger — read-only display, click to open popup */}
      <div
        ref={triggerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: '#ffffff',
          border: isOpen ? '1px solid #2563eb' : '1px solid #d1d5db',
          boxShadow: isOpen ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none',
          borderRadius: 6,
          height: 28,
          padding: '0 8px',
          boxSizing: 'border-box',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
          minWidth: 0,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          if (isOpen) close(); else openPopup();
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', flexShrink: 0 }}>
          <SearchIcon />
        </span>
        <span style={{
          flex: 1,
          fontSize: 11,
          fontFamily: 'sans-serif',
          color: selectedPost ? '#374151' : '#9ca3af',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}>
          {selectedPost ? selectedPost.name : 'Select a post…'}
        </span>
      </div>

      {/* Download button */}
      <button
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563eb',
          padding: 0,
          cursor: selectedPost ? 'pointer' : 'not-allowed',
          opacity: selectedPost ? 1 : 0.35,
          transition: 'filter 0.12s ease',
        }}
        disabled={!selectedPost}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleDownload}
        title={selectedPost ? `Download ${selectedPost.name}` : 'No post selected'}
      >
        <DownloadIcon />
      </button>

      {popup}
    </div>
  );
});

PostDropdown.displayName = 'PostDropdown';
export default PostDropdown;

function itemStyle(active: boolean, hovered: boolean): React.CSSProperties {
  let bg = '#ffffff';
  if (active && hovered) bg = '#dbeafe';
  else if (active) bg = '#eff6ff';
  else if (hovered) bg = '#f8fafc';
  return {
    minHeight: ITEM_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    cursor: 'pointer',
    background: bg,
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 0.1s ease',
    boxSizing: 'border-box',
  };
}
