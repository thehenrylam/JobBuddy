import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JobBuddy',
    description: 'Parse job descriptions into Markdown and analyze them with LLMs.',
    version: '0.1.0',
    permissions: ['activeTab', 'storage', 'scripting'],
  },
});
