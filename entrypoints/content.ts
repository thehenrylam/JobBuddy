import React from 'react';
import { createRoot } from 'react-dom/client';
import AiButton from './ai_interface/App';
import { detectPageType } from '../services/pageDetect';
import { showInfoToast, showErrorToast, showProgressToast, updateProgressToast, resolveProgressToast, dismissProgressToast } from './ai_interface/toast';

const STORAGE_KEY = 'floatingButtonVisible';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // Outer panel — flex row, children stretch to full height
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      width: '264px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: '2147483647',
      display: 'none',
      userSelect: 'none',
      alignItems: 'stretch',     // children fill full height — no uncovered strips
      justifyContent: 'flex-start',
      cursor: 'default',
      overflow: 'hidden',
    });

    // Narrow drag handle — the only zone that starts panel dragging
    const dragHandle = document.createElement('div');
    Object.assign(dragHandle.style, {
      width: '14px',
      flexShrink: '0',
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: '11px',
      letterSpacing: '-1px',
      borderRight: '1px solid #e5e7eb',
      transition: 'color 0.15s ease, background 0.15s ease',
    });
    dragHandle.textContent = '⋮⋮';
    panel.appendChild(dragHandle);

    dragHandle.addEventListener('mouseenter', () => {
      if (!isDragging) {
        dragHandle.style.color = '#475569';
        dragHandle.style.background = '#f1f5f9';
      }
    });
    dragHandle.addEventListener('mouseleave', () => {
      if (!isDragging) {
        dragHandle.style.color = '#94a3b8';
        dragHandle.style.background = 'transparent';
      }
    });

    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      dragHandle.style.cursor = 'grabbing';
      panel.style.cursor = 'grabbing';
      e.preventDefault();
    });

    // React content — fills remaining width, stops drag from propagating
    const aiButtonContainer = document.createElement('div');
    Object.assign(aiButtonContainer.style, {
      flex: '1',
      minWidth: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      cursor: 'default',
    });
    // Prevent any click inside the React tree from triggering the drag handle's parent
    aiButtonContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    panel.appendChild(aiButtonContainer);
    createRoot(aiButtonContainer).render(React.createElement(AiButton));

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
      dragHandle.style.cursor = 'grab';
      panel.style.cursor = 'default';
    });

    document.documentElement.appendChild(panel);

    const result = await browser.storage.local.get(STORAGE_KEY);
    panel.style.display = result[STORAGE_KEY] ? 'flex' : 'none';

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !(STORAGE_KEY in changes)) return;
      panel.style.display = changes[STORAGE_KEY].newValue ? 'flex' : 'none';
    });

    browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === 'JB_RUN_DETECTION') {
        detectPageType().then(sendResponse);
        return true;
      }
      if (msg?.type === 'JB_TOAST') {
        if (msg.variant === 'error') showErrorToast(msg.message);
        else showInfoToast(msg.message);
        sendResponse({ ok: true });
        return false;
      }
      if (msg?.type === 'JB_TOAST_START') {
        showProgressToast(msg.id, msg.message, () => {
          browser.runtime.sendMessage({ type: 'JB_PARSE_CANCEL' }).catch(console.error);
        });
        sendResponse({ ok: true });
        return false;
      }
      if (msg?.type === 'JB_TOAST_UPDATE') {
        updateProgressToast(msg.id, msg.message);
        sendResponse({ ok: true });
        return false;
      }
      if (msg?.type === 'JB_TOAST_RESOLVE') {
        resolveProgressToast(msg.id, msg.message, msg.variant);
        sendResponse({ ok: true });
        return false;
      }
      if (msg?.type === 'JB_TOAST_DISMISS') {
        dismissProgressToast(msg.id);
        sendResponse({ ok: true });
        return false;
      }
    });
  },
});
