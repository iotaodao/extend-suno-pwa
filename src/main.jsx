import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerServiceWorker } from './lib/sw-register.js';
import { initNativePlatform } from './lib/native.js';

// Hide splash once React is mounted
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Defer until after first paint
requestAnimationFrame(() => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 350);
  }
});

// Register PWA service worker (skipped automatically on Capacitor native)
registerServiceWorker();

// Initialize native platform (no-op on web)
initNativePlatform();
