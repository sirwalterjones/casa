import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            CASA Test Page
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            If you can see this, the app is working!
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-green-600 font-medium">✅ App is working!</p>
          <p className="text-gray-600 mt-2">
            The authentication is working, but there might be an issue with the dashboard page.
          </p>
        </div>
      </div>
    </div>
  );
} 