import React, { useState } from 'react';
import MainView from './MainView';
import SettingsView from './SettingsView';

type View = 'main' | 'settings';

export default function App() {
  const [view, setView] = useState<View>('main');

  return view === 'settings'
    ? <SettingsView onBack={() => setView('main')} />
    : <MainView onSettings={() => setView('settings')} />;
}
