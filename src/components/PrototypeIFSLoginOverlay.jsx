import FinalIFSLoginPage from './FinalIFSLoginPage.jsx';

export default function PrototypeIFSLoginOverlay() {
  const isSignInPath = window.location.pathname.startsWith('/sign-in');

  if (!isSignInPath) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-[#060e20]">
      <FinalIFSLoginPage />
    </div>
  );
}
