import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'
import './global.css'
import App from './App.jsx'
import AuthInteractiveBackground from './components/AuthInteractiveBackground.jsx'
import IFSLoginOverlay from './components/IFSLoginOverlay.jsx'

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
    <AuthInteractiveBackground />
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <IFSLoginOverlay />
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById('root')).render(app)

initNativeApp();
