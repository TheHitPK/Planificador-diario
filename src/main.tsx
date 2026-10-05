import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import { AuthProvider } from './api/AuthContext';
import { ToastProvider } from './components/Toaster';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": respeta la preferencia "reducir movimiento" del sistema. */}
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  </StrictMode>,
);
