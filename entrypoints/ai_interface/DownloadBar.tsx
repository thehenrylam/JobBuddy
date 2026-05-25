import React from 'react';
import { getSavedPosts } from '../../services/savedPosts';
import type { JobPost } from '../../lib/jobPost/types';

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" width={13} height={13}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 _]/g, '')
    .trim()
    .replace(/[ _]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildMarkdown(post: JobPost): string {
  const payRange =
    post.pay_range[0] !== null || post.pay_range[1] !== null
      ? `[${post.pay_range[0] ?? 'null'}, ${post.pay_range[1] ?? 'null'}]`
      : 'NULL';
  const keywords = post.keywords.length > 0 ? post.keywords.join(', ') : 'NULL';
  return [
    `# ${post.job_title}`,
    '',
    `job_title: "${post.job_title}"`,
    `company: "${post.company}"`,
    `job_type: ${post.job_type}`,
    `location: "${post.location}"`,
    `pay_range: ${payRange}`,
    `date: ${post.date}`,
    `keywords: ${keywords}`,
    '',
    '---',
    '',
    post.post_data,
  ].join('\n');
}

function buildFilename(post: JobPost): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${slugify(post.job_title)}_${slugify(post.company)}_${post.id.slice(-5)}_${ts}.md`;
}

export default function DownloadBar({ postId }: { postId: string }) {
  const handleDownload = async () => {
    const posts = await getSavedPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const blob = new Blob([buildMarkdown(post)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: buildFilename(post),
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.bar}>
      <button style={styles.btn} onClick={handleDownload}>
        <DownloadIcon />
        <span>Download Post</span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    height: 34,
    flexShrink: 0,
    background: '#eff6ff',
    borderTop: '1px solid #bfdbfe',
    borderBottom: '1px solid #bfdbfe',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 5,
    padding: '0 9px',
    height: 24,
    fontSize: 11,
    fontFamily: 'sans-serif',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
};
