import React, { useState } from 'react';
import { clientAuth } from '../lib/supabasePersonalization';

const TokenLogin = ({ onLogin, onSwitchToPIN }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTokenLogin = async (e) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await clientAuth.authenticateWithToken(token);
      
      if (result.success) {
        onLogin(result.client);
      } else {
        setError(result.error || 'Invalid token');
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-emerald-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-amber-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Token Authentication
          </h1>
          <p className="text-gray-600 text-sm">
            Enter your secure token to access the IFS program
          </p>
        </div>

        <form onSubmit={handleTokenLogin} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Secure Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your token"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !token.trim()}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 ${
              isLoading || !token.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Validating Token...
              </span>
            ) : (
              'Login with Token'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToPIN}
            className="text-amber-600 hover:text-amber-700 text-sm font-semibold transition-colors duration-200"
          >
            ← Back to PIN Login
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Note:</strong> Tokens expire after 15 minutes for security. 
            If your token has expired, please request a new one.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenLogin;