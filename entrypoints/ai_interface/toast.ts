import './toast.css';

const MAX_TOASTS = 5;
const TOAST_DURATION_MS = 4000;

let container: HTMLDivElement | null = null;
const activeToasts: HTMLDivElement[] = [];

function getContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'jb-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function dismiss(toast: HTMLDivElement): void {
  const idx = activeToasts.indexOf(toast);
  if (idx === -1) return; // already dismissed

  activeToasts.splice(idx, 1);

  // Collapse height and fade simultaneously so toasts below fill the space smoothly
  Object.assign(toast.style, {
    transition: 'opacity 0.25s ease, max-height 0.3s ease, padding-top 0.3s ease, padding-bottom 0.3s ease',
    opacity: '0',
    maxHeight: '0',
    paddingTop: '0',
    paddingBottom: '0',
  });

  setTimeout(() => toast.remove(), 300);
}

function showToast(message: string, variant: 'error' | 'info'): void {
  const c = getContainer();

  // FIFO: evict oldest (last in array) if at capacity
  if (activeToasts.length >= MAX_TOASTS) dismiss(activeToasts[activeToasts.length - 1]);

  // FLIP step 1 — record where each existing toast is before the layout changes
  const prevTops = activeToasts.map(t => t.getBoundingClientRect().top);

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
  c.prepend(toast);          // newest at top, pushes existing toasts down
  activeToasts.unshift(toast);

  // FLIP step 2 — snap existing toasts back to their old visual positions (no transition)
  activeToasts.slice(1).forEach((t, i) => {
    const delta = prevTops[i] - t.getBoundingClientRect().top;
    if (delta === 0) return;
    t.style.transition = 'none';
    t.style.transform = `translateY(${delta}px)`;
  });

  // FLIP step 3 — force the browser to register the snapped positions
  void document.body.offsetHeight;

  // FLIP step 4 — animate existing toasts to their new positions
  activeToasts.slice(1).forEach(t => {
    t.style.transition = 'transform 0.3s ease';
    t.style.transform = 'translateY(0)';
  });

  // Slide and fade the new toast in (double-rAF ensures initial state is committed first)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }));

  // Auto-dismiss with hover-to-pause
  let remaining = TOAST_DURATION_MS;
  let start = Date.now();
  let timer = setTimeout(() => dismiss(toast), remaining);

  toast.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    remaining -= Date.now() - start;
  });

  toast.addEventListener('mouseleave', () => {
    start = Date.now();
    timer = setTimeout(() => dismiss(toast), remaining);
  });

  closeBtn.addEventListener('click', () => {
    clearTimeout(timer);
    dismiss(toast);
  });
}

export function showErrorToast(message: string): void {
  showToast(message, 'error');
}

export function showInfoToast(message: string): void {
  showToast(message, 'info');
}
