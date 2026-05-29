import type { ChatMessage, ChatThread } from '../lib/chat/types';

const STORAGE_KEY = 'chatHistories';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type HistoryStore = Record<string, ChatThread>;

async function getStore(): Promise<HistoryStore> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] ?? {}) as HistoryStore;
}

async function setStore(store: HistoryStore): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: store });
}

export async function getChatThread(postId: string): Promise<ChatThread | null> {
  const store = await getStore();
  return store[postId] ?? null;
}

export async function saveChatThread(thread: ChatThread): Promise<void> {
  const store = await getStore();
  store[thread.postId] = thread;
  await setStore(store);
}

export async function appendMessage(postId: string, msg: ChatMessage): Promise<void> {
  const store = await getStore();
  const existing = store[postId];
  const now = Date.now();
  if (existing) {
    existing.messages.push(msg);
    existing.lastModified = now;
  } else {
    store[postId] = { postId, messages: [msg], lastModified: now };
  }
  await setStore(store);
}

export async function deleteChatThread(postId: string): Promise<void> {
  const store = await getStore();
  delete store[postId];
  await setStore(store);
}

export async function purgeOldThreads(): Promise<void> {
  const store = await getStore();
  const cutoff = Date.now() - MAX_AGE_MS;
  const pruned: HistoryStore = {};
  for (const [id, thread] of Object.entries(store)) {
    if (thread.lastModified >= cutoff) pruned[id] = thread;
  }
  await setStore(pruned);
}
