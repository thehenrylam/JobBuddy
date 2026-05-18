import React from 'react';

export default function App() {
  return (
    <div style={{ width: 320, padding: 16, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>JobBuddy</h1>
      <p style={{ fontSize: 13, color: '#555' }}>
        Navigate to a job listing page, then click the button below to parse it.
      </p>
      <button
        style={{
          marginTop: 12,
          padding: '8px 16px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          width: '100%',
        }}
        onClick={() => {
          // TODO: trigger content script to parse the current page
        }}
      >
        Parse Job Description
      </button>
    </div>
  );
}
