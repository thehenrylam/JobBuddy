import {
  getResumeFile,
  saveResumeFile,
  getUserPromptFile,
  saveAboutUser,
  clearAboutUser,
  getSourceHash,
  saveSourceHash,
  clearSourceHash,
  getParseStatus,
  saveParseStatus,
  computeHash,
} from '../services/aboutUser';
import { extractText } from '../services/fileExtract';
import { parseAboutUser } from '../services/llmAboutUser';
import type { ResumeFile, UserPromptFile, SourceHash } from '../lib/aboutUser/types';

const DEBOUNCE_MS = 5000;

export default defineBackground(() => {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;
  let isExtracting = false;

  // In-memory mirrors of storage so onChanged handlers don't need async reads.
  let currentResume: ResumeFile | null = null;
  let currentUserPrompt: UserPromptFile | null = null;
  let currentSourceHash: SourceHash | null = null;

  // ── toast helpers ─────────────────────────────────────────────────────────────

  const PARSE_TOAST_ID = 'parse';

  async function sendToActiveTab(message: Record<string, unknown>) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.id != null) {
        await browser.tabs.sendMessage(tab.id, message);
      }
    } catch { /* content script may not be injected on this page */ }
  }

  const startParseToast = (message: string) =>
    sendToActiveTab({ type: 'JB_TOAST_START', id: PARSE_TOAST_ID, message });

  const updateParseToast = (message: string) =>
    sendToActiveTab({ type: 'JB_TOAST_UPDATE', id: PARSE_TOAST_ID, message });

  const resolveParseToast = (message: string, variant: 'info' | 'error') =>
    sendToActiveTab({ type: 'JB_TOAST_RESOLVE', id: PARSE_TOAST_ID, message, variant });

  // ── parse helpers ─────────────────────────────────────────────────────────────

  async function invalidateCache() {
    await Promise.all([clearAboutUser(), clearSourceHash()]);
    currentSourceHash = null;
  }

  async function runParse() {
    const resume = currentResume;
    const userPrompt = currentUserPrompt;

    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    abortController?.abort();
    const ctrl = new AbortController();
    abortController = ctrl;

    await saveParseStatus('working');
    await startParseToast('Sending to LLM…');

    try {
      const result = await parseAboutUser(
        resume?.text ?? null,
        userPrompt?.content ?? null,
        ctrl.signal,
      );
      const newHash: SourceHash = {
        resumeHash: resume ? computeHash(resume.base64) : null,
        promptHash: userPrompt ? computeHash(userPrompt.content) : null,
      };
      await Promise.all([saveAboutUser(result), saveSourceHash(newHash)]);
      currentSourceHash = newHash;
      await saveParseStatus('idle');
      await resolveParseToast('Profile updated', 'info');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      await saveParseStatus('idle');
      const msg = err instanceof Error ? err.message : String(err);
      await resolveParseToast(`Profile parse failed: ${msg}`, 'error');
    } finally {
      abortController = null;
    }
  }

  function scheduleParse() {
    if (debounceTimer) clearTimeout(debounceTimer);
    abortController?.abort();
    abortController = null;

    if (!currentResume || !currentUserPrompt) {
      saveParseStatus('idle').catch(console.error);
      return;
    }

    saveParseStatus('waiting').catch(console.error);
    startParseToast('Waiting to parse profile…').catch(console.error);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runParse().catch(console.error);
    }, DEBOUNCE_MS);
  }

  async function extractAndSchedule(rf: ResumeFile) {
    if (isExtracting) return;
    isExtracting = true;
    const showProgress = currentUserPrompt != null;
    if (showProgress) {
      await saveParseStatus('working');
      await startParseToast('Extracting text from resume…');
    }
    try {
      const bytes = Uint8Array.from(atob(rf.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: rf.mimeType || 'application/octet-stream' });
      const file = new File([blob], rf.filename, { type: rf.mimeType || 'application/octet-stream' });
      const text = await extractText(file);
      const updated = { ...rf, text };
      await saveResumeFile(updated);
      currentResume = updated;
    } catch (e) {
      if (showProgress) {
        const msg = e instanceof Error ? e.message : String(e);
        await resolveParseToast(`Text extraction failed: ${msg}`, 'error');
      }
    } finally {
      isExtracting = false;
    }
    scheduleParse();
  }

  // ── message handlers ──────────────────────────────────────────────────────────

  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'JB_PARSE_NOW') {
      runParse().catch(console.error);
      sendResponse({ ok: true });
    }
    if (msg?.type === 'JB_PARSE_CANCEL') {
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      abortController?.abort();
      abortController = null;
      saveParseStatus('idle').catch(console.error);
      sendToActiveTab({ type: 'JB_TOAST_DISMISS', id: PARSE_TOAST_ID }).catch(console.error);
      sendResponse({ ok: true });
    }
    return false;
  });

  // ── storage watcher ───────────────────────────────────────────────────────────

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    let sourceFilesChanged = false;

    if ('resumeFile' in changes) {
      const newR = (changes.resumeFile.newValue ?? null) as ResumeFile | null;

      if (currentSourceHash?.resumeHash != null) {
        const newH = newR ? computeHash(newR.base64) : null;
        if (newH !== currentSourceHash.resumeHash) {
          invalidateCache().catch(console.error);
        }
      }

      currentResume = newR;
      sourceFilesChanged = true;
    }

    if ('userPromptFile' in changes) {
      const newU = (changes.userPromptFile.newValue ?? null) as UserPromptFile | null;

      if (currentSourceHash?.promptHash != null) {
        const newH = newU ? computeHash(newU.content) : null;
        if (newH !== currentSourceHash.promptHash) {
          invalidateCache().catch(console.error);
        }
      }

      currentUserPrompt = newU;
      sourceFilesChanged = true;
    }

    if (sourceFilesChanged && !isExtracting) {
      if (currentResume && !currentResume.text) {
        extractAndSchedule(currentResume).catch(console.error);
      } else {
        scheduleParse();
      }
    }
    // If isExtracting, extractAndSchedule's finally will call scheduleParse with the latest state.
  });

  // ── initialization ────────────────────────────────────────────────────────────

  (async () => {
    [currentResume, currentUserPrompt, currentSourceHash] = await Promise.all([
      getResumeFile(), getUserPromptFile(), getSourceHash(),
    ]);

    // If the extension crashed mid-parse, reset the stuck status.
    const ps = await getParseStatus();
    if (ps === 'working' || ps === 'waiting') await saveParseStatus('idle');

    // Handle a resume saved without extracted text (e.g. extension was off when file was picked).
    if (currentResume && !currentResume.text) {
      await extractAndSchedule(currentResume);
    }
  })().catch(console.error);

  console.log('JobBuddy: background ready');
});
