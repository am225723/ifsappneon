import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'
import './global.css'
import App from './App.jsx'
import PrototypeIFSLoginOverlay from './components/PrototypeIFSLoginOverlay.jsx'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

async function initNativeApp() {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setBackgroundColor({ color: '#d97706' });
    } catch {
      // Native status bar configuration can fail on unsupported platforms.
    }
    try {
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    } catch {
      // Keyboard listeners are optional outside supported native shells.
    }
    try {
      await SplashScreen.hide();
    } catch {
      // Splash screen may already be hidden or unavailable.
    }
  }
}

const app = (
  <StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <PrototypeIFSLoginOverlay />
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById('root')).render(app)

initNativeApp();
