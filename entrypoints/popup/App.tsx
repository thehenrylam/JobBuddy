import React, { useState } from 'react';
import MainView from './MainView';
import SettingsView from './SettingsView';
import LlmSettingsView from './LlmSettingsView';
import SavedPostsView from './SavedPostsView';
import AboutUserSettingsView from './AboutUserSettingsView';

type View = 'main' | 'settings' | 'llm-settings' | 'saved-posts' | 'about-user';

export default function App() {
  const [view, setView] = useState<View>('main');

  if (view === 'llm-settings') return <LlmSettingsView onBack={() => setView('settings')} />;
  if (view === 'saved-posts') return <SavedPostsView onBack={() => setView('settings')} />;
  if (view === 'about-user') return <AboutUserSettingsView onBack={() => setView('settings')} />;
  if (view === 'settings') return <SettingsView onBack={() => setView('main')} onLlmSettings={() => setView('llm-settings')} onSavedPosts={() => setView('saved-posts')} onAboutUser={() => setView('about-user')} />;
  return <MainView onSettings={() => setView('settings')} onLlmSettings={() => setView('llm-settings')} onAboutUser={() => setView('about-user')} />;
}
