import { useEffect, useState } from 'react';
import SundayBestLoginPage from './SundayBestLoginPage.jsx';

function getCurrentPath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

export default function PrototypeIFSLoginOverlay() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const isSignInPath = window.location.pathname.startsWith('/sign-in');

  useEffect(() => {
    const updatePath = () => setCurrentPath(getCurrentPath());
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('ifs-location-change'));
      return result;
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('ifs-location-change'));
      return result;
    };

    window.addEventListener('popstate', updatePath);
    window.addEventListener('ifs-location-change', updatePath);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('ifs-location-change', updatePath);
    };
  }, []);

  useEffect(() => {
    if (!isSignInPath) return undefined;

    let scrollTimer;
    const root = document.documentElement;
    const setScrolling = () => {
      root.classList.add('ifs-login-is-scrolling');
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        root.classList.remove('ifs-login-is-scrolling');
      }, 180);
    };

    window.addEventListener('scroll', setScrolling, { passive: true });
    window.addEventListener('touchmove', setScrolling, { passive: true });

    return () => {
      window.clearTimeout(scrollTimer);
      root.classList.remove('ifs-login-is-scrolling');
      window.removeEventListener('scroll', setScrolling);
      window.removeEventListener('touchmove', setScrolling);
    };
  }, [isSignInPath, currentPath]);

  if (!isSignInPath) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#060e20]">
      <SundayBestLoginPage />
    </div>
  );
}
