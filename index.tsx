import React from 'react';
import { createRoot } from 'react-dom/client';
// CSS is bundled in production build
// import './src/index.css';
import App from './App';
import { A11yStatus } from './components/A11yStatus';
import { AppProvider } from './contexts/AppContext';

// Expose context globally for testing
declare global {
  interface Window {
    appContext: any;
  }
}

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container #app not found');
}

// Clear any vanilla JS content
container.innerHTML = '';

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
      <A11yStatus />
    </AppProvider>
  </React.StrictMode>
);
