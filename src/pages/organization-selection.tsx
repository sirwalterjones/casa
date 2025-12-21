import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export default function OrganizationSelectionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    if (!loading && user) {
      loadOrganizations();
    }
  }, [user, loading, router]);

  const loadOrganizations = async () => {
    try {
      const response = await apiClient.casaGet('organizations');
      if (response.success && response.data) {
        setOrganizations(response.data as Organization[]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const handleOrganizationSelect = async () => {
    if (!selectedOrg) return;

    setIsLoading(true);
    try {
      // In a real app, you would switch to the selected organization
      // For now, just redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Select Organization - CASA Case Management System</title>
        <meta name="description" content="Select your organization" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Select Organization
            </h1>
            
            <p className="text-gray-600 mb-6">
              Please select the organization you would like to work with.
            </p>
            
            <div className="space-y-4">
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={handleOrganizationSelect}
                disabled={!selectedOrg || isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 