import { useEffect, useState } from 'react';

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );

  const signatureStr = base64UrlDecode(encodedSignature);
  const signatureBytes = new Uint8Array(signatureStr.length);
  for (let i = 0; i < signatureStr.length; i++) {
    signatureBytes[i] = signatureStr.charCodeAt(i);
  }

  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data));
  if (!valid) throw new Error('Invalid token signature');

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired');
  }

  return payload;
}

function extractSSOToken() {
  const searchParams = new URLSearchParams(window.location.search);
  const fromSearch = searchParams.get('sso_token');
  if (fromSearch) return fromSearch;

  const fullPath = window.location.pathname + window.location.search + window.location.hash;
  const match = fullPath.match(/[?&%3F]sso_token[=]([^&%26#]+)/i) ||
                decodeURIComponent(fullPath).match(/[?&]sso_token=([^&#]+)/);
  if (match) return decodeURIComponent(match[1]);

  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  return hashParams.get('sso_token');
}

export default function SSOCallback({ onLogin }) {
  const [status, setStatus] = useState('Verifying your login...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSSO = async () => {
      const token = extractSSOToken();
      console.log('SSO token extracted:', token ? 'found' : 'not found');
      if (!token) {
        setError('No SSO token provided');
        return;
      }

      try {
        const secret = import.meta.env.VITE_JWT_SECRET;
        if (!secret) {
          throw new Error('JWT secret not configured');
        }

        await verifyJWT(token, secret);

        setStatus('Login verified! Redirecting...');

        if (onLogin) {
          const success = await onLogin('051189');
          if (!success) {
            setError('Auto-login failed. Please use your PIN instead.');
          }
        }
      } catch (err) {
        console.error('SSO verification failed:', err);
        setError(err.message || 'SSO verification failed');
      }
    };

    handleSSO();
  }, [onLogin]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-amber-100/60 to-stone-100/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#9888;&#65039;</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Login Failed</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block py-3 px-8 bg-gradient-to-r from-amber-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-amber-700 hover:to-emerald-700 transition-all duration-300"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-amber-100/60 to-stone-100/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{status}</h2>
        <p className="text-gray-500">Please wait...</p>
      </div>
    </div>
  );
}
