import React from 'react';
import Head from 'next/head';
import Navigation from '@/components/Navigation';

export default function SimpleDashboard() {
  return (
    <>
      <Head>
        <title>Dashboard - CASA Case Management</title>
        <meta name="description" content="CASA Case Management Dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage="/dashboard" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              CASA Case Management Dashboard
            </h1>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Welcome to CASA Case Management
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-600">Active Cases</h3>
                    <p className="text-2xl font-bold text-blue-900">24</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-600">Volunteers</h3>
                    <p className="text-2xl font-bold text-green-900">45</p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-600">Pending Reviews</h3>
                    <p className="text-2xl font-bold text-yellow-900">12</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-purple-600">Court Hearings</h3>
                    <p className="text-2xl font-bold text-purple-900">8</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Recent Activity
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">🏠</span>
                      <span className="text-sm text-gray-600">
                        Home visit completed for Case #2024-001
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">⚖️</span>
                      <span className="text-sm text-gray-600">
                        Court hearing attended for Case #2024-002
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2">📋</span>
                      <span className="text-sm text-gray-600">
                        New case assigned - Case #2024-015
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    View All Cases
                  </button>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                    Add New Case
                  </button>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                    Manage Volunteers
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 