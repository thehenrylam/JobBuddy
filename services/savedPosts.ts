import type { JobPost } from '../lib/jobPost/types';

const STORAGE_KEY = 'savedPosts';

export async function getSavedPosts(): Promise<JobPost[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] ?? []) as JobPost[];
}

export async function savePost(post: JobPost): Promise<void> {
  const posts = await getSavedPosts();
  await browser.storage.local.set({ [STORAGE_KEY]: [post, ...posts] });
}

export async function deletePost(id: string): Promise<void> {
  const posts = await getSavedPosts();
  await browser.storage.local.set({ [STORAGE_KEY]: posts.filter((p) => p.id !== id) });
}
