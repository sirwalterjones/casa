import { useState } from 'react';
import Head from 'next/head';
import { apiClient } from '@/services/apiClient';

export default function DebugLogin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    setLoading(true);
    try {
      console.log('Testing login flow...');
      
      // Test JWT login
      const jwtResponse = await fetch('http://casa-backend.local/wp-json/jwt-auth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'walter@narcrms.net',
          password: 'password123'
        })
      });
      
      const jwtData = await jwtResponse.json();
      console.log('JWT Response:', jwtData);
      
      if (jwtData.token) {
        // Test user profile API
        const profileResponse = await fetch('http://casa-backend.local/wp-json/casa/v1/user/profile', {
          headers: {
            'Authorization': `Bearer ${jwtData.token}`
          }
        });
        
        const profileData = await profileResponse.json();
        console.log('Profile Response:', profileData);
        
        // Test organizations API
        const orgResponse = await fetch('http://casa-backend.local/wp-json/casa/v1/organizations', {
          headers: {
            'Authorization': `Bearer ${jwtData.token}`
          }
        });
        
        const orgData = await orgResponse.json();
        console.log('Organizations Response:', orgData);
        
        setResult({
          jwt: jwtData,
          profile: profileData,
          organizations: orgData
        });
      } else {
        setResult({ error: 'JWT login failed', jwtData });
      }
    } catch (error) {
      console.error('Debug login error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Debug Login - CASA</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Login Flow</h1>
          
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <button
              onClick={testLogin}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Login Flow'}
            </button>
          </div>
          
          {result && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">API Responses</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 