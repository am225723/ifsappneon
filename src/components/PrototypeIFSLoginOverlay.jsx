import { useEffect } from 'react';
import SundayBestLoginPage from './SundayBestLoginPage.jsx';

export default function PrototypeIFSLoginOverlay() {
  const isSignInPath = window.location.pathname.startsWith('/sign-in');

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
  }, [isSignInPath]);

  if (!isSignInPath) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#060e20]">
      <SundayBestLoginPage />
    </div>
  );
}
