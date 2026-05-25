import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
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

function matches(post: JobPost, query: string): boolean {
  const q = query.toLowerCase();
  return (
    post.name.toLowerCase().includes(q) ||
    post.job_title.toLowerCase().includes(q) ||
    post.company.toLowerCase().includes(q) ||
    post.id.toLowerCase().includes(q)
  );
}

const ITEM_HEIGHT = 34;
const MAX_VISIBLE = 5;

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
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

const PostDropdown = forwardRef<PostDropdownHandle, Props>(({ selectedId, onSelect }, ref) => {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | 'none' | null>(null);
  const [listStyle, setListStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => getSavedPosts().then(setPosts).catch(() => {});

  useEffect(() => { load(); }, []);

  useImperativeHandle(ref, () => ({ refresh: load }));

  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent) => {
      if (!inputRef.current?.closest('[data-jb-dropdown]')?.contains(e.target as Node)) {
        setIsOpen(false);
        setHoveredId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const openDropdown = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.closest('[data-jb-dropdown]')!.getBoundingClientRect();
    const count = Math.min(MAX_VISIBLE, filtered.length + 1);
    const listH = count * ITEM_HEIGHT;
    setListStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.top - listH - 6,
      width: rect.width,
      maxHeight: MAX_VISIBLE * ITEM_HEIGHT,
      overflowY: 'auto',
      background: '#ffffff',
      border: '1px solid #e0e7ff',
      borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
      zIndex: 2147483647,
    });
    setIsOpen(true);
  };

  const filtered = query ? posts.filter((p) => matches(p, query)) : posts;

  const selectedPost = selectedId ? posts.find((p) => p.id === selectedId) : null;
  const displayValue = query || (selectedPost ? selectedPost.name : '');

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setQuery('');
    setIsOpen(false);
    setHoveredId(null);
  };

  const list = (
    <div style={listStyle}>
      <div
        style={itemStyle(selectedId === null, hoveredId === 'none')}
        onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
        onMouseEnter={() => setHoveredId('none')}
        onMouseLeave={() => setHoveredId(null)}
      >
        <span style={{ ...styles.itemLabel, color: '#9ca3af', fontStyle: 'italic' }}>— None</span>
      </div>
      {filtered.map((post) => (
        <div
          key={post.id}
          style={itemStyle(post.id === selectedId, hoveredId === post.id)}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(post.id); }}
          onMouseEnter={() => setHoveredId(post.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <span style={styles.itemLabel}>{post.name}</span>
        </div>
      ))}
    </div>
  );

  const wrapperBorder = focused ? '1px solid #2563eb' : '1px solid #d1d5db';
  const wrapperShadow = focused ? '0 0 0 2px rgba(37,99,235,0.15)' : 'none';

  const handleSearchIconMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openDropdown();
    inputRef.current?.focus();
  };

  const handleChevronMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setHoveredId(null);
    } else {
      openDropdown();
      inputRef.current?.focus();
    }
  };

  return (
    <div data-jb-dropdown="true" style={styles.wrapper}>
      <div style={{ ...styles.inputWrapper, border: wrapperBorder, boxShadow: wrapperShadow }}>
        <span style={styles.leadIcon} onMouseDown={handleSearchIconMouseDown}>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          style={styles.input}
          placeholder={selectedPost ? selectedPost.name : 'Search saved posts…'}
          value={displayValue}
          onFocus={() => { setFocused(true); openDropdown(); }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) openDropdown();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <span style={styles.trailIcon} onMouseDown={handleChevronMouseDown}>
          <ChevronIcon open={isOpen} />
        </span>
      </div>
      {isOpen && ReactDOM.createPortal(list, document.body)}
    </div>
  );
});

PostDropdown.displayName = 'PostDropdown';
export default PostDropdown;

function itemStyle(active: boolean, hovered: boolean): React.CSSProperties {
  let bg = 'transparent';
  if (active && hovered) bg = '#dbeafe';
  else if (active) bg = '#eff6ff';
  else if (hovered) bg = '#f8fafc';
  return {
    height: ITEM_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    cursor: 'pointer',
    background: bg,
    borderBottom: '1px solid #f3f4f6',
    transition: 'background 0.1s ease',
  };
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    padding: '6px 8px 4px',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: '#ffffff',
    borderRadius: 6,
    height: 28,
    gap: 4,
    padding: '0 8px',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  leadIcon: {
    display: 'flex',
    alignItems: 'center',
    color: '#9ca3af',
    flexShrink: 0,
    cursor: 'pointer',
    padding: '2px',
  },
  trailIcon: {
    display: 'flex',
    alignItems: 'center',
    color: '#9ca3af',
    flexShrink: 0,
    cursor: 'pointer',
    padding: '2px',
  },
  input: {
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
  },
  itemLabel: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
