import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize logging
if (import.meta.env.MODE === 'development') {
  console.log('Starting application in development mode');
  console.log('Environment variables:', {
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    VITE_RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY?.slice(0, 8) + '...',
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
