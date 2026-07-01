import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

export default function SSOCallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-amber-100/60 to-stone-100/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Finishing secure sign-in…</h2>
        <p className="text-gray-500">Please wait while we complete your login.</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
