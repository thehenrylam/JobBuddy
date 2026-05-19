const BUTTON_OPACITY = 0.75;
const STORAGE_KEY = 'floatingButtonVisible';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Outer draggable panel
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      width: '80px',
      height: '80px',
      backgroundColor: '#ffffff',
      opacity: String(BUTTON_OPACITY),
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      cursor: 'grab',
      zIndex: '2147483647',
      display: 'none',
      userSelect: 'none',
      alignItems: 'center',
      justifyContent: 'center',
    });

    // Inner AI button — sparkling star icon, centered with edge padding for drag area
    const aiButton = document.createElement('button');
    Object.assign(aiButton.style, {
      width: '52px',
      height: '52px',
      border: 'none',
      borderRadius: '12px',
      background: 'rgba(37, 99, 235, 0.08)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      color: '#2563eb',
      flexShrink: '0',
      outline: 'none',
      transition: 'background 0.15s ease, transform 0.1s ease',
    });

    aiButton.addEventListener('mouseenter', () => {
      aiButton.style.background = 'rgba(37, 99, 235, 0.16)';
    });
    aiButton.addEventListener('mouseleave', () => {
      aiButton.style.background = 'rgba(37, 99, 235, 0.08)';
      aiButton.style.transform = 'scale(1)';
    });
    aiButton.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      aiButton.style.background = 'rgba(37, 99, 235, 0.28)';
      aiButton.style.transform = 'scale(0.92)';
    });
    aiButton.addEventListener('mouseup', () => {
      aiButton.style.background = 'rgba(37, 99, 235, 0.16)';
      aiButton.style.transform = 'scale(1)';
    });

    aiButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        stroke-width="1.5" stroke="currentColor" width="28" height="28">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    `;


    panel.appendChild(aiButton);

    panel.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      panel.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const x = Math.max(0, Math.min(e.clientX - dragOffsetX, window.innerWidth - panel.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - dragOffsetY, window.innerHeight - panel.offsetHeight));
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.cursor = 'grab';
    });

    document.body.appendChild(panel);

    const result = await browser.storage.local.get(STORAGE_KEY);
    panel.style.display = result[STORAGE_KEY] ? 'flex' : 'none';

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !(STORAGE_KEY in changes)) return;
      panel.style.display = changes[STORAGE_KEY].newValue ? 'flex' : 'none';
    });
  },
});
