import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/styles/design-tokens.css';
import './src/styles/typography.css';
import './src/styles/accessibility.css';
import App from './App';
import { A11yStatus } from './components/A11yStatus';

const container = document.getElementById('app');
if (container) {
  // Clear any vanilla JS content
  container.innerHTML = '';

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
      <A11yStatus />
    </React.StrictMode>
  );
}