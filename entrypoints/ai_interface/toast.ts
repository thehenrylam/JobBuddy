import './toast.css';

const MAX_TOASTS = 5;
const TOAST_DURATION_MS = 4000;

let container: HTMLDivElement | null = null;
const activeToasts: HTMLDivElement[] = [];

// Progress toasts are persistent (no auto-dismiss) and keyed by a caller-defined id.
const progressToasts = new Map<string, {
  toast: HTMLDivElement;
  textEl: HTMLSpanElement;
}>();

function getContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'jb-toast-container';
    document.documentElement.appendChild(container);
  }
  return container;
}

function dismiss(toast: HTMLDivElement): void {
  const idx = activeToasts.indexOf(toast);
  if (idx === -1) return;
  activeToasts.splice(idx, 1);
  Object.assign(toast.style, {
    transition: 'opacity 0.25s ease, max-height 0.3s ease, padding-top 0.3s ease, padding-bottom 0.3s ease',
    opacity: '0',
    maxHeight: '0',
    paddingTop: '0',
    paddingBottom: '0',
  });
  setTimeout(() => toast.remove(), 300);
}

// Insert a toast at the top of the stack with FLIP animation.
function insertToast(toast: HTMLDivElement): void {
  const c = getContainer();
  if (activeToasts.length >= MAX_TOASTS) {
    // Never evict a progress toast — find the oldest non-progress one instead.
    const toEvict = [...activeToasts].reverse().find(t => !t.classList.contains('jb-toast--progress'));
    if (toEvict) dismiss(toEvict);
  }

  const prevTops = activeToasts.map(t => t.getBoundingClientRect().top);

  c.prepend(toast);
  activeToasts.unshift(toast);

  activeToasts.slice(1).forEach((t, i) => {
    const delta = prevTops[i] - t.getBoundingClientRect().top;
    if (delta === 0) return;
    t.style.transition = 'none';
    t.style.transform = `translateY(${delta}px)`;
  });
  void document.body.offsetHeight;
  activeToasts.slice(1).forEach(t => {
    t.style.transition = 'transform 0.3s ease';
    t.style.transform = 'translateY(0)';
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }));
}

// Attach hover-to-pause auto-dismiss and wire the close button.
function attachAutoDismiss(toast: HTMLDivElement, closeBtn: HTMLButtonElement, duration: number): void {
  let remaining = duration;
  let start = Date.now();
  let timer = setTimeout(() => dismiss(toast), remaining);
  toast.addEventListener('mouseenter', () => { clearTimeout(timer); remaining -= Date.now() - start; });
  toast.addEventListener('mouseleave', () => { start = Date.now(); timer = setTimeout(() => dismiss(toast), remaining); });
  closeBtn.addEventListener('click', () => { clearTimeout(timer); dismiss(toast); });
}

// ── Standard (auto-dismiss) toasts ────────────────────────────────────────────

function showToast(message: string, variant: 'error' | 'info'): void {
  const toast = document.createElement('div');
  toast.className = `jb-toast jb-toast--${variant}`;

  const text = document.createElement('span');
  text.className = 'jb-toast__text';
  text.textContent = `JobBuddy: ${message}`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'jb-toast__close';
  closeBtn.textContent = '✕';

  toast.appendChild(text);
  toast.appendChild(closeBtn);

  insertToast(toast);
  attachAutoDismiss(toast, closeBtn, TOAST_DURATION_MS);
}

export function showErrorToast(message: string): void { showToast(message, 'error'); }
export function showInfoToast(message: string): void { showToast(message, 'info'); }

// ── Progress toasts ───────────────────────────────────────────────────────────

function makeSpinner(): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = 'jb-toast__spinner';
  // Inline SVG spinner — works without CSS animation keyframes
  s.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".25" stroke-width="2"/>
    <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate"
        from="0 12 12" to="360 12 12" dur=".8s" repeatCount="indefinite"/>
    </path>
  </svg>`;
  return s;
}

function makeCancelBtn(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'jb-toast__cancel';
  btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3"/>
  </svg>Cancel`;
  return btn;
}

/**
 * Create (or update) a persistent progress toast.
 * The toast shows a spinner and a Cancel button.
 * onCancel fires when the user clicks Cancel; it also dismisses the toast.
 */
export function showProgressToast(id: string, message: string, onCancel: () => void): void {
  const existing = progressToasts.get(id);
  if (existing) {
    existing.textEl.textContent = `JobBuddy: ${message}`;
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'jb-toast jb-toast--progress';

  const spinnerEl = makeSpinner();

  const textEl = document.createElement('span');
  textEl.className = 'jb-toast__text';
  textEl.textContent = `JobBuddy: ${message}`;

  const cancelBtn = makeCancelBtn();
  cancelBtn.addEventListener('click', () => {
    onCancel();
    progressToasts.delete(id);
    dismiss(toast);
  });

  toast.appendChild(spinnerEl);
  toast.appendChild(textEl);
  toast.appendChild(cancelBtn);

  insertToast(toast);
  progressToasts.set(id, { toast, textEl });
}

/** Update the message of an existing progress toast. No-op if the toast was dismissed. */
export function updateProgressToast(id: string, message: string): void {
  const entry = progressToasts.get(id);
  if (entry) entry.textEl.textContent = `JobBuddy: ${message}`;
}

/**
 * Resolve a progress toast into its final state.
 * - 'info' (success): briefly shows the confirmation, then auto-closes.
 * - 'error': stays open with a close button until the user dismisses it manually.
 */
export function resolveProgressToast(id: string, message: string, variant: 'info' | 'error'): void {
  const entry = progressToasts.get(id);
  if (!entry) { showToast(message, variant); return; }

  progressToasts.delete(id);
  const { toast, textEl } = entry;

  toast.className = `jb-toast jb-toast--${variant}`;
  textEl.textContent = `JobBuddy: ${message}`;
  toast.querySelectorAll('.jb-toast__spinner, .jb-toast__cancel').forEach(el => el.remove());

  const closeBtn = document.createElement('button');
  closeBtn.className = 'jb-toast__close';
  closeBtn.textContent = '✕';
  toast.appendChild(closeBtn);

  if (variant === 'info') {
    // Operation confirmed — auto-close after a brief moment so the user sees the confirmation.
    attachAutoDismiss(toast, closeBtn, 2000);
  } else {
    // Error — stay open until the user reads it and closes manually.
    closeBtn.addEventListener('click', () => dismiss(toast));
  }
}

/** Immediately remove a progress toast (e.g. user-initiated cancel). No-op if already gone. */
export function dismissProgressToast(id: string): void {
  const entry = progressToasts.get(id);
  if (!entry) return;
  progressToasts.delete(id);
  dismiss(entry.toast);
}
