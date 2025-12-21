import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ForceLogout() {
  const router = useRouter();

  useEffect(() => {
    // Clear all authentication data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('All authentication data cleared');
    
    // Redirect to login page
    setTimeout(() => {
      router.push('/auth/login');
    }, 2000);
  }, [router]);

  return (
    <>
      <Head>
        <title>Logging Out - CASA Case Management System</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Logging Out
            </h1>
            
            <p className="text-gray-600 mb-6">
              Clearing all authentication data and redirecting to login...
            </p>
            
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    </>
  );
} 