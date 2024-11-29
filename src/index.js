import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Thêm meta tag để tránh cache
const meta = document.createElement('meta');
meta.httpEquiv = 'Cache-Control';
meta.content = 'no-cache, no-store, must-revalidate';
document.head.appendChild(meta);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
