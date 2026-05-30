import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const PINAuthDiagnostic = () => {
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostic = async () => {
    setIsLoading(true);
    const results = {};

    try {
      // Test 1: Check Supabase connection
      results.supabaseConnection = await testSupabaseConnection();
      
      // Test 2: Check if table exists
      results.tableExists = await testTableExists();
      
      // Test 3: Check existing clients
      results.existingClients = await checkExistingClients();
      
      // Test 4: Test PIN authentication
      results.pinAuthTest = await testPINAuth();
      
      // Test 5: Test client creation
      results.clientCreationTest = await testClientCreation();

    } catch (error) {
      results.error = error.message;
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('ifs_clients').select('count').single();
      return { success: !error, data: data?.count || 0, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testTableExists = async () => {
    try {
      const { data, error } = await supabase
        .from('ifs_clients')
        .select('*')
        .limit(1);
      return { 
        success: !error, 
        hasData: data && data.length > 0,
        error: error?.message 
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const checkExistingClients = async () => {
    try {
      const { data, error } = await supabase
        .from('ifs_clients')
        .select('id, name, pin, status, created_at')
        .eq('status', 'active');
      
      return {
        success: !error,
        clients: data || [],
        count: data?.length || 0,
        error: error?.message
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testPINAuth = async () => {
    if (!testResults.existingClients?.clients?.length) {
      return { success: false, error: 'No clients to test with' };
    }

    const testClient = testResults.existingClients.clients[0];
    
    try {
      const result = await clientAuth.authenticateWithPIN(testClient.pin);
      return {
        success: result.success,
        testedPIN: testClient.pin,
        clientName: testClient.name,
        result: result,
        error: result.error
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testClientCreation = async () => {
    try {
      const testClient = {
        name: 'Test Client ' + Date.now(),
        email: `test${Date.now()}@example.com`,
        phone: '1234567890',
        notes: 'Diagnostic test client'
      };

      const result = await clientAuth.createClient(testClient);
      return {
        success: result.success,
        createdPIN: result.pin,
        clientData: result.client,
        error: result.error
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const createTestClient = async () => {
    setIsLoading(true);
    try {
      const result = await clientAuth.createClient({
        name: 'Manual Test Client',
        email: `manual${Date.now()}@example.com`,
        phone: '9876543210',
        notes: 'Manually created for testing'
      });

      if (result.success) {
        alert(`Test client created!\n\nName: ${result.client.name}\nPIN: ${result.pin}\n\nUse this PIN to test login.`);
        await runDiagnostic(); // Refresh diagnostics
      } else {
        alert(`Failed to create test client: ${result.error}`);
      }
    } catch (error) {
      alert(`Error creating test client: ${error.message}`);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">PIN Authentication Diagnostic Tool</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Diagnostic Results</h2>
            <div className="space-x-4">
              <button
                onClick={runDiagnostic}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Running...' : 'Run Diagnostics'}
              </button>
              <button
                onClick={createTestClient}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Create Test Client
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Running diagnostics...</p>
            </div>
          )}

          {!isLoading && Object.keys(testResults).length > 0 && (
            <div className="space-y-6">
              {/* Supabase Connection */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">1. Supabase Connection</h3>
                {testResults.supabaseConnection?.success ? (
                  <div className="text-green-600">
                    ✅ Connected successfully
                    <p className="text-sm">Client count: {testResults.supabaseConnection.data}</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    ❌ Connection failed
                    <p className="text-sm">{testResults.supabaseConnection?.error}</p>
                  </div>
                )}
              </div>

              {/* Table Exists */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">2. ifs_clients Table</h3>
                {testResults.tableExists?.success ? (
                  <div className="text-green-600">
                    ✅ Table exists and accessible
                    <p className="text-sm">Has data: {testResults.tableExists.hasData ? 'Yes' : 'No'}</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    ❌ Table not accessible
                    <p className="text-sm">{testResults.tableExists?.error}</p>
                  </div>
                )}
              </div>

              {/* Existing Clients */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">3. Existing Active Clients</h3>
                {testResults.existingClients?.success ? (
                  <div>
                    <div className="text-green-600 mb-2">
                      ✅ Found {testResults.existingClients.count} active clients
                    </div>
                    {testResults.existingClients.clients.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PIN</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {testResults.existingClients.clients.map((client) => (
                              <tr key={client.id}>
                                <td className="px-4 py-2 text-sm">{client.name}</td>
                                <td className="px-4 py-2 text-sm font-mono bg-gray-100">{client.pin}</td>
                                <td className="px-4 py-2 text-sm">
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                    {client.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {new Date(client.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-600">
                    ❌ Error checking clients
                    <p className="text-sm">{testResults.existingClients?.error}</p>
                  </div>
                )}
              </div>

              {/* PIN Auth Test */}
              {testResults.pinAuthTest && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">4. PIN Authentication Test</h3>
                  {testResults.pinAuthTest.success ? (
                    <div className="text-green-600">
                      ✅ PIN authentication working
                      <p className="text-sm">Tested PIN: {testResults.pinAuthTest.testedPIN}</p>
                      <p className="text-sm">Client: {testResults.pinAuthTest.clientName}</p>
                    </div>
                  ) : (
                    <div className="text-red-600">
                      ❌ PIN authentication failed
                      <p className="text-sm">{testResults.pinAuthTest.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Client Creation Test */}
              {testResults.clientCreationTest && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">5. Client Creation Test</h3>
                  {testResults.clientCreationTest.success ? (
                    <div className="text-green-600">
                      ✅ Client creation working
                      <p className="text-sm">Created PIN: {testResults.clientCreationTest.createdPIN}</p>
                    </div>
                  ) : (
                    <div className="text-red-600">
                      ❌ Client creation failed
                      <p className="text-sm">{testResults.clientCreationTest.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Overall Error */}
              {testResults.error && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-lg mb-2 text-red-800">Overall Error</h3>
                  <p className="text-red-600">{testResults.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting Guide</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">If Supabase Connection fails:</h3>
              <p>Check the Supabase URL and API key in src/lib/supabase.js</p>
            </div>
            <div>
              <h3 className="font-semibold">If Table not accessible:</h3>
              <p>Verify the table name is 'ifs_clients' (lowercase) in your database</p>
            </div>
            <div>
              <h3 className="font-semibold">If No active clients found:</h3>
              <p>Click "Create Test Client" to create a client for testing</p>
            </div>
            <div>
              <h3 className="font-semibold">If PIN authentication fails:</h3>
              <p>Check the authentication logic in src/lib/supabasePersonalization.js</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PINAuthDiagnostic;