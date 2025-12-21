import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';
import { CasaCase } from '@/types';

interface CaseListItem {
  id: string;
  case_number: string;
  child_first_name: string;
  child_last_name: string;
  status: string;
  priority: string;
  assigned_volunteer_name?: string;
  created_at: string;
  updated_at: string;
}

export default function CasesList() {
  const { user, loading } = useRequireAuth();
  const { hasRole, isAdmin } = usePermissions();
  const router = useRouter();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Load cases from API
  useEffect(() => {
    const loadCases = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiClient.casaGet('cases');
        console.log('Cases API response:', response);
        
        if (response.success && response.data) {
          // Handle nested API response structure
          const casesApiData = response.data as any;
          console.log('Cases API data structure:', casesApiData);
          
          if (casesApiData.success && casesApiData.data && casesApiData.data.cases) {
            console.log('Found cases in nested structure:', casesApiData.data.cases.length);
            setCases(casesApiData.data.cases || []);
          } else if (casesApiData.cases) {
            console.log('Found cases in direct structure:', casesApiData.cases.length);
            // Fallback for direct cases array
            setCases(casesApiData.cases || []);
          } else {
            console.log('No cases found in API response');
            setCases([]);
          }
        } else {
          console.error('API response not successful:', response);
          setError('Failed to load cases');
          setCases([]);
        }
      } catch (error: any) {
        console.error('Failed to load cases:', error);
        setError(error?.message || 'Failed to load cases');
        setCases([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadCases();
    }
  }, [user]);

  // Filter cases based on search and filters
  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = !searchTerm || 
      caseItem.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${caseItem.child_first_name} ${caseItem.child_last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (caseItem.assigned_volunteer_name && caseItem.assigned_volunteer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || caseItem.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Cases - CASA Case Management System</title>
        <meta name="description" content="Manage and view CASA cases" />
      </Head>

      <Navigation currentPage="cases" />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Header (matches other pages with color hero) */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-light mb-2">Cases</h1>
                  <p className="text-blue-100 text-lg">Manage and track CASA cases in your organization</p>
                </div>
                {hasRole(['administrator', 'casa_administrator', 'supervisor', 'casa_supervisor']) && (
                  <Link
                    href="/cases/intake"
                    className="bg-white text-blue-700 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    + New Case
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Cases
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by case number, child name, or volunteer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading cases</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading cases...</p>
            </div>
          )}

          {/* Cases List */}
          {!isLoading && !error && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {filteredCases.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No cases found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                      ? 'Try adjusting your search criteria or filters.'
                      : 'Get started by creating your first case.'
                    }
                  </p>
                  {hasRole(['administrator', 'casa_administrator', 'supervisor', 'casa_supervisor']) && 
                   !searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                    <div className="mt-6">
                      <Link
                        href="/cases/intake"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                      >
                        + Create New Case
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Case
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Child
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volunteer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCases.map((caseItem) => (
                        <tr key={caseItem.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {caseItem.case_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {caseItem.child_first_name} {caseItem.child_last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(caseItem.status)}`}>
                              {caseItem.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(caseItem.priority)}`}>
                              {caseItem.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {caseItem.assigned_volunteer_name || 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(caseItem.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/cases/${caseItem.id}`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Summary Stats */}
          {!isLoading && !error && cases.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-gray-900">{cases.length}</div>
                <div className="text-sm text-gray-600">Total Cases</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-green-600">
                  {cases.filter(c => c.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Cases</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {cases.filter(c => c.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Cases</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-red-600">
                  {cases.filter(c => c.priority === 'high').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}