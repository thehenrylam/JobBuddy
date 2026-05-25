import React, { useState } from 'react';
import MainView from './MainView';
import SettingsView from './SettingsView';
import LlmSettingsView from './LlmSettingsView';
import SavedPostsView from './SavedPostsView';

type View = 'main' | 'settings' | 'llm-settings' | 'saved-posts';

export default function App() {
  const [view, setView] = useState<View>('main');

  if (view === 'llm-settings') return <LlmSettingsView onBack={() => setView('settings')} />;
  if (view === 'saved-posts') return <SavedPostsView onBack={() => setView('settings')} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('main')} onLlmSettings={() => setView('llm-settings')} onSavedPosts={() => setView('saved-posts')} />;
  return <MainView onSettings={() => setView('settings')} onLlmSettings={() => setView('llm-settings')} />;
}
