import React, { useState, useEffect } from 'react';
import { getSavedPosts, deletePost } from '../../services/savedPosts';
import type { JobPost } from '../../lib/jobPost/types';

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" width={14} height={14}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" width={12} height={12}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" width={12} height={12}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default function SavedPostsView({ onBack }: { onBack: () => void }) {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [newestFirst, setNewestFirst] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => getSavedPosts().then(setPosts).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    await deletePost(id);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const sorted = newestFirst ? posts : [...posts].reverse();

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <button className="jb-btn-ghost" style={styles.backButton} onClick={onBack} title="Back">←</button>
        <span style={styles.title}>Saved Posts</span>
        <button
          className="jb-btn-icon"
          style={styles.orderButton}
          title={newestFirst ? 'Showing newest first' : 'Showing oldest first'}
          onClick={() => setNewestFirst((v) => !v)}
        >
          {newestFirst ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p style={styles.empty}>No saved posts yet.</p>
      ) : (
        <div style={styles.list}>
          {sorted.map((post) => (
            <div key={post.id} style={styles.item}>
              <div style={styles.itemRow}>
                <span style={styles.itemName} title={post.name}>{post.name}</span>
                <div style={styles.itemActions}>
                  <button
                    className="jb-btn-icon"
                    style={styles.actionBtn}
                    onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                    title="View"
                  >
                    {expandedId === post.id ? '▲' : '▼'}
                  </button>
                  <button
                    className="jb-btn-icon"
                    style={{ ...styles.actionBtn, ...styles.actionBtnDanger }}
                    onClick={() => handleDelete(post.id)}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
              {expandedId === post.id && (
                <pre style={styles.postData}>{post.post_data || post.job_title}</pre>
              )}
            </div>
          ))}
        </div>
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
    maxHeight: 600,
    overflowY: 'auto',
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
  orderButton: {
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
  empty: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    margin: '24px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    background: '#fafafa',
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemActions: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#555',
    fontSize: 10,
  },
  actionBtnDanger: {
    color: '#dc2626',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
  },
  postData: {
    margin: 0,
    padding: '10px 12px',
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#374151',
    background: '#f9fafb',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: 300,
    overflowY: 'auto',
    borderTop: '1px solid #e5e7eb',
  },
};
