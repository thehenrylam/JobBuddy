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

const ITEM_HEIGHT = 30;
const MAX_VISIBLE = 5;

const PostDropdown = forwardRef<PostDropdownHandle, Props>(({ selectedId, onSelect }, ref) => {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
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
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const openDropdown = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.closest('[data-jb-dropdown]')!.getBoundingClientRect();
    const listH = Math.min(MAX_VISIBLE, filtered.length + 1) * ITEM_HEIGHT;
    setListStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.top - listH - 4,
      width: rect.width,
      maxHeight: MAX_VISIBLE * ITEM_HEIGHT,
      overflowY: 'auto',
      background: '#fff',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
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
  };

  const list = (
    <div style={listStyle}>
      <div
        style={itemStyle(selectedId === null)}
        onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
      >
        <span style={styles.itemLabel}>None</span>
      </div>
      {filtered.map((post) => (
        <div
          key={post.id}
          style={itemStyle(post.id === selectedId)}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(post.id); }}
        >
          <span style={styles.itemLabel}>{post.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div data-jb-dropdown="true" style={styles.wrapper}>
      <input
        ref={inputRef}
        style={styles.input}
        placeholder={selectedPost ? selectedPost.name : 'Search saved posts…'}
        value={displayValue}
        onFocus={openDropdown}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!isOpen) openDropdown();
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
      {isOpen && filtered.length === 0 && !query && null}
      {isOpen && ReactDOM.createPortal(list, document.body)}
    </div>
  );
});

PostDropdown.displayName = 'PostDropdown';
export default PostDropdown;

function itemStyle(active: boolean): React.CSSProperties {
  return {
    height: ITEM_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    cursor: 'pointer',
    background: active ? '#eff6ff' : 'transparent',
    borderBottom: '1px solid #f3f4f6',
  };
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    padding: '6px 8px 0',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  input: {
    width: '100%',
    height: 26,
    fontSize: 11,
    padding: '0 8px',
    border: '1px solid #d1d5db',
    borderRadius: 5,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    color: '#374151',
    background: '#fafafa',
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
