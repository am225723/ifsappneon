import React, { useState } from 'react';
import { clientAuth } from '../lib/supabasePersonalization';

const TestClientCreator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const createTestClient = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const testClient = {
        name: `Test Client ${new Date().toLocaleTimeString()}`,
        email: `test${Date.now()}@example.com`,
        phone: '555-123-4567',
        notes: 'This is a test client created for PIN authentication testing'
      };

      const response = await clientAuth.createClient(testClient);
      
      if (response.success) {
        setResult({
          success: true,
          client: response.client,
          pin: response.pin,
          message: `Test client created successfully! Use PIN: ${response.pin} to login.`
        });
      } else {
        setResult({
          success: false,
          error: response.error,
          message: `Failed to create test client: ${response.error}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
        message: `Unexpected error: ${error.message}`
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Create Test Client
        </h1>
        
        <div className="text-gray-600 mb-6 text-center">
          <p className="mb-4">This tool creates a test client for PIN authentication testing.</p>
          <p className="text-sm">The generated PIN can be used to test the login functionality.</p>
        </div>

        <button
          onClick={createTestClient}
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creating Client...
            </span>
          ) : (
            'Create Test Client'
          )}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            <p className={`text-sm ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.message}
            </p>
            {result.success && result.client && (
              <div className="mt-4 p-3 bg-white rounded border border-green-300">
                <p className="text-xs font-semibold text-gray-700 mb-1">Client Details:</p>
                <p className="text-xs text-gray-600">Name: {result.client.name}</p>
                <p className="text-xs text-gray-600">PIN: <span className="font-mono font-bold text-green-600">{result.pin}</span></p>
                <p className="text-xs text-gray-600">Email: {result.client.email}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-amber-600 hover:text-amber-700 text-sm font-semibold"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestClientCreator;