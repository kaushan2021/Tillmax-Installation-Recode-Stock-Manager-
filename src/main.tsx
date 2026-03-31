import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR errors in development
if (import.meta.env.DEV) {
  // 1. Suppress console.error for Vite HMR connection failures
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('[vite] failed to connect to websocket') || 
        msg.includes('WebSocket connection to') && msg.includes('failed')) {
      return;
    }
    originalError.apply(console, args);
  };
  
  // 2. Prevent "WebSocket closed without opened" from triggering unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || (typeof reason === 'string' ? reason : '');
    
    if (message.includes('WebSocket closed without opened') || 
        message.includes('failed to connect to websocket')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
