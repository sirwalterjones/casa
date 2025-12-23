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
          if (casesData.success && casesData.data?.cases) {
            setDrafts(casesData.data.cases);
          } else if (casesData.cases) {
            setDrafts(casesData.cases);
          } else {
            setDrafts([]);
          }
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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Draft Cases - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Draft Cases</h1>
              <p className="text-gray-600">Cases saved as drafts that need to be completed</p>
            </div>
            <Link
              href="/cases/intake"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              New Case
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {drafts.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No draft cases</h3>
              <p className="mt-1 text-sm text-gray-500">All your cases have been submitted.</p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Case #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drafts.map((draft) => (
                    <tr key={draft.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {draft.case_number || 'No number'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {draft.child_first_name} {draft.child_last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          draft.priority === 'high' ? 'bg-red-100 text-red-800' :
                          draft.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {draft.priority || 'Not set'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(draft.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/cases/${draft.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Continue
                        </Link>
                        <button
                          onClick={() => handleDelete(draft.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
