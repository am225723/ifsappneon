import { useAuth } from '@clerk/clerk-react';
import FinalIFSLoginPage from './FinalIFSLoginPage.jsx';

export default function PrototypeIFSLoginOverlay() {
  const { isLoaded, isSignedIn } = useAuth();
  const isSignInPath = window.location.pathname.startsWith('/sign-in');

  if (!isLoaded || isSignedIn || !isSignInPath) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#060e20]">
      <FinalIFSLoginPage />
    </div>
  );
}
