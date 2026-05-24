import React from 'react';
import { createRoot } from 'react-dom/client';
import AiButton from './ai_interface/App';

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

    // Inner AI button — mounted as a React component
    const aiButtonContainer = document.createElement('div');
    aiButtonContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    panel.appendChild(aiButtonContainer);
    createRoot(aiButtonContainer).render(React.createElement(AiButton));

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
