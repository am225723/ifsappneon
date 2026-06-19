import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import IFSLoginPage from './IFSLoginPage.jsx';
import './IFSLoginOverlay.css';

function getCurrentPath() {
  return window.location.pathname;
}

export default function IFSLoginOverlay() {
  const { isLoaded, isSignedIn } = useAuth();
  const [path, setPath] = useState(getCurrentPath);

  useEffect(() => {
    const updatePath = () => setPath(getCurrentPath());
    window.addEventListener('popstate', updatePath);
    window.addEventListener('pushstate', updatePath);
    window.addEventListener('replacestate', updatePath);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event('pushstate'));
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('replacestate'));
    };

    return () => {
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('pushstate', updatePath);
      window.removeEventListener('replacestate', updatePath);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  if (!isLoaded || isSignedIn || !path.startsWith('/sign-in')) {
    return null;
  }

  return (
    <div className="ifs-login-overlay">
      <IFSLoginPage />
    </div>
  );
}
