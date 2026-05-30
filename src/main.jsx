import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'
import './index.css'
import App from './App.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

async function initNativeApp() {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setBackgroundColor({ color: '#d97706' });
    } catch {}
    try {
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    } catch {}
    try {
      await SplashScreen.hide();
    } catch {}
  }
}

const app = (
  <StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

if (!clerkPublishableKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY is missing. Clerk UI will be disabled and API auth may require ALLOW_PIN_AUTH_WITHOUT_CLERK=true.');
}

createRoot(document.getElementById('root')).render(app)

initNativeApp();
