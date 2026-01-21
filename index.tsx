import React from 'react';
import { createRoot } from 'react-dom/client';
import './src/styles/design-tokens.css';
import './src/styles/typography.css';
import App from './App';

const container = document.getElementById('app');
if (container) {
  // Clear any vanilla JS content
  container.innerHTML = '';

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}