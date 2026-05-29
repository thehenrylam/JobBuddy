import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JobBuddy',
    description: 'Parse job descriptions into Markdown and analyze them with LLMs.',
    version: '0.1.0',
    permissions: ['activeTab', 'storage', 'scripting', 'unlimitedStorage', 'windows'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: '/icons/JobBuddy-16x16.png',
      32: '/icons/JobBuddy-32x32.png',
      48: '/icons/JobBuddy-48x48.png',
      128: '/icons/JobBuddy-128x128.png',
    },
  },
});
