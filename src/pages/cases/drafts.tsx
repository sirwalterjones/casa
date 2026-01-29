import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface DraftCase {
  id: string;
  case_number: string;
  child_first_name: string;
  child_last_name: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export default function DraftCases() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDrafts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.casaGet('cases?status=draft');

        if (response.success && response.data) {
          const casesData = response.data as any;
          let draftCases: any[] = [];

          if (casesData.success && casesData.data?.cases) {
            draftCases = casesData.data.cases;
          } else if (casesData.data?.cases) {
            draftCases = casesData.data.cases;
          } else if (casesData.cases) {
            draftCases = casesData.cases;
          } else if (Array.isArray(casesData.data)) {
            draftCases = casesData.data;
          } else if (Array.isArray(casesData)) {
            draftCases = casesData;
          }

          // Filter only draft status cases
          setDrafts(draftCases.filter((c: any) => c.status === 'draft' || c.case_status === 'draft'));
        }
      } catch (error: any) {
        console.error('Failed to load drafts:', error);
        setError(error?.message || 'Failed to load drafts');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadDrafts();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      await apiClient.casaDelete(`cases/${id}`);
      setDrafts(drafts.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Draft Cases - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation />

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Draft Cases</h1>
              <p className="text-indigo-100 text-lg">Cases saved as drafts that need to be completed</p>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Drafts</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{drafts.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Pending Review</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{drafts.filter(d => d.priority === 'high').length}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Link
                href="/cases/intake"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-sm"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Case
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {drafts.length === 0 ? (
            <div className="bg-white dark:bg-fintech-bg-card shadow-sm rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No draft cases</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">All your cases have been submitted. Start a new case to get started.</p>
              <div className="mt-6">
                <Link
                  href="/cases/intake"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  + New Case
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-fintech-bg-card shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-fintech-bg-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Case #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Child Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-fintech-bg-card divide-y divide-gray-200 dark:divide-gray-700">
                    {drafts.map((draft) => (
                      <tr key={draft.id} className="hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {draft.case_number || 'No number'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {draft.child_first_name} {draft.child_last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            draft.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            draft.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {draft.priority || 'Not set'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {new Date(draft.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/cases/${draft.id}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                          >
                            Continue
                          </Link>
                          <button
                            onClick={() => handleDelete(draft.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
