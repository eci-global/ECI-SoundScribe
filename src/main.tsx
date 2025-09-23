import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { suppressExtensionErrors } from './utils/suppressExtensionErrors'

console.log('main.tsx - Starting application initialization');

// Suppress distracting browser extension errors
suppressExtensionErrors();

const rootElement = document.getElementById("root");
console.log('main.tsx - Root element found:', !!rootElement);

if (!rootElement) {
  console.error('main.tsx - Root element not found!');
} else {
  console.log('main.tsx - Creating React root and rendering App');
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('main.tsx - App rendered successfully');
  } catch (error) {
    console.error('main.tsx - Error rendering App:', error);
  }
}
