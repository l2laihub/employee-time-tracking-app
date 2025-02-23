import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { initializeStorage } from './lib/storage';
import './index.css';

// Initialize storage buckets
initializeStorage().catch(console.error);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-right"
      expand={false}
      richColors
    />
  </React.StrictMode>
);
