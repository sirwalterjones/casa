import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';
import { CONTACT_TYPE_LABELS } from '@/utils/constants';

interface ContactLog {
  id: string;
  case_number: string;
  child_name: string;
  contact_type: string;
  contact_date: string;
  contact_time?: string;
  duration_minutes?: number;
  location?: string;
  participants?: string;
  purpose?: string;
  summary: string;
  observations?: string;
  concerns?: string;
  follow_up_required?: boolean;
  follow_up_notes?: string;
  next_contact_date?: string;
  mileage?: number;
  expenses?: number;
  created_at: string;
}

export default function ContactHistory() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ContactLog | null>(null);
  const [filterCase, setFilterCase] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const loadContactLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.casaGet('contact-logs?limit=100');

        if (response.success && response.data) {
          const apiData = response.data as any;
          let logsData: any[] = [];

          // Handle multiple response structures
          if (apiData.success && apiData.data?.contact_logs) {
            logsData = apiData.data.contact_logs;
          } else if (apiData.data?.contact_logs) {
            logsData = apiData.data.contact_logs;
          } else if (apiData.contact_logs) {
            logsData = apiData.contact_logs;
          } else if (Array.isArray(apiData.data)) {
            logsData = apiData.data;
          } else if (Array.isArray(apiData)) {
            logsData = apiData;
          }

          setContactLogs(Array.isArray(logsData) ? logsData : []);
        }
      } catch (err: any) {
        console.error('Failed to load contact logs:', err);
        setError(err?.message || 'Failed to load contact history');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadContactLogs();
    }
  }, [user]);

  // Handle case filter from URL
  useEffect(() => {
    if (router.query.case) {
      setFilterCase(router.query.case as string);
    }
  }, [router.query.case]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-fintech-bg-primary">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Filter contact logs
  const filteredLogs = contactLogs.filter(log => {
    const matchesCase = !filterCase || log.case_number?.toLowerCase().includes(filterCase.toLowerCase());
    const matchesType = !filterType || log.contact_type === filterType;
    const matchesSearch = !searchTerm ||
      log.child_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.case_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCase && matchesType && matchesSearch;
  });

  // Calculate stats
  const totalContacts = contactLogs.length;
  const thisMonthContacts = contactLogs.filter(log => {
    const logDate = new Date(log.contact_date);
    const now = new Date();
    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
  }).length;
  const followUpsRequired = contactLogs.filter(log => log.follow_up_required).length;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContactTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'in_person': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'phone': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'video': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'email': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'text': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'court': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[type] || colors['other'];
  };

  return (
    <>
      <Head>
        <title>Contact History - CASA Case Management System</title>
        <meta name="description" content="View contact log history for all cases" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation currentPage="/contacts/history" />

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 dark:from-green-700 dark:to-teal-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Contact History</h1>
              <p className="text-green-100 text-lg">View and search past contact interactions</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-fintech-bg-secondary shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link
                href="/dashboard"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/cases/intake"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm"
              >
                Case Intake
              </Link>
              <Link
                href="/contacts/log"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm"
              >
                Contact Log
              </Link>
              <Link
                href="/contacts/history"
                className="py-4 px-1 border-b-2 border-green-500 text-green-600 dark:text-green-400 font-medium text-sm"
              >
                Contact History
              </Link>
              <Link
                href="/documents"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm"
              >
                Documents
              </Link>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Total Contacts</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalContacts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-300">This Month</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{thisMonthContacts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Follow-ups Required</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{followUpsRequired}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-fintech-bg-secondary dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Case Number</label>
                <input
                  type="text"
                  value={filterCase}
                  onChange={(e) => setFilterCase(e.target.value)}
                  placeholder="Filter by case..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-fintech-bg-secondary dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-fintech-bg-secondary dark:text-white"
                >
                  <option value="">All Types</option>
                  {Object.entries(CONTACT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Link
                  href="/contacts/log"
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-2 px-4 rounded-md font-medium hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200 text-center"
                >
                  + New Contact Log
                </Link>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No contact logs found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                {contactLogs.length === 0 ? 'Get started by creating a new contact log.' : 'Try adjusting your filters.'}
              </p>
              <div className="mt-6">
                <Link
                  href="/contacts/log"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  + New Contact Log
                </Link>
              </div>
            </div>
          ) : (
            /* Contact Logs List */
            <div className="bg-white dark:bg-fintech-bg-card rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-fintech-bg-secondary">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Case
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Child
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Summary
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Follow-up
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-fintech-bg-card divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(log.contact_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {log.case_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {log.child_name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getContactTypeColor(log.contact_type)}`}>
                            {CONTACT_TYPE_LABELS[log.contact_type as keyof typeof CONTACT_TYPE_LABELS] || log.contact_type || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                          {log.summary || 'No summary'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.follow_up_required ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              Required
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setSelectedLog(null)}>
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-fintech-bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-fintech-bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Contact Log Details
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {selectedLog.case_number} - {formatDate(selectedLog.contact_date)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Child Name</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedLog.child_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Contact Type</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getContactTypeColor(selectedLog.contact_type)}`}>
                        {CONTACT_TYPE_LABELS[selectedLog.contact_type as keyof typeof CONTACT_TYPE_LABELS] || selectedLog.contact_type || 'Other'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Duration</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedLog.duration_minutes ? `${selectedLog.duration_minutes} minutes` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Location</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedLog.location || 'N/A'}</p>
                    </div>
                  </div>

                  {selectedLog.participants && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Participants</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedLog.participants}</p>
                    </div>
                  )}

                  {selectedLog.purpose && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Purpose</p>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedLog.purpose}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Summary</p>
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedLog.summary || 'N/A'}</p>
                  </div>

                  {selectedLog.observations && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Observations</p>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedLog.observations}</p>
                    </div>
                  )}

                  {selectedLog.concerns && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Concerns</p>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedLog.concerns}</p>
                    </div>
                  )}

                  {selectedLog.follow_up_required && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-2">Follow-up Required</h4>
                      {selectedLog.follow_up_notes && (
                        <p className="text-sm text-amber-700 dark:text-amber-300">{selectedLog.follow_up_notes}</p>
                      )}
                      {selectedLog.next_contact_date && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                          Next Contact: {formatDate(selectedLog.next_contact_date)}
                        </p>
                      )}
                    </div>
                  )}

                  {(selectedLog.mileage || selectedLog.expenses) && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Mileage</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedLog.mileage ? `${selectedLog.mileage} miles` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Expenses</p>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedLog.expenses ? `$${selectedLog.expenses.toFixed(2)}` : 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-fintech-bg-secondary px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-fintech-bg-card text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
