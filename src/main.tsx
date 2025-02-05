import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add error boundary for debugging
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    // Show error on screen instead of white screen
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background: #111827; color: #EF4444; padding: 20px;">
        <h1 style="margin-bottom: 10px;">Error Loading Application</h1>
        <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
      </div>
    `;
  }
}