import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FilePickerView from './FilePickerView';
import './popup.css';

const hash = window.location.hash;
let root: React.ReactElement;

// Standalone file-picker windows are opened via browser.windows.create with a
// URL hash.  Render only the minimal picker UI instead of the full popup.
if (hash === '#pick-resume') {
  root = <FilePickerView fileType="resume" />;
} else if (hash === '#pick-prompt') {
  root = <FilePickerView fileType="prompt" />;
} else {
  root = <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{root}</React.StrictMode>,
);
