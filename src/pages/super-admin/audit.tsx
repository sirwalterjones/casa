import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface LogEntry {
  timestamp?: string;
  time?: string;
  action?: string;
  user_id?: number;
  user_email?: string;
  email?: string;
  details?: string;
  ip?: string;
  organization_id?: number;
  resource_type?: string;
  resource_id?: number;
}

export default function AuditLogPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [securityLogs, setSecurityLogs] = useState<LogEntry[]>([]);
  const [accessLogs, setAccessLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'security' | 'access'>('security');

  useEffect(() => {
    if (!authLoading && user) {
      loadLogs();
    }
  }, [authLoading, user]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const [securityRes, accessRes] = await Promise.all([
        apiClient.casaGet<any>('super-admin/security-log?limit=100'),
        apiClient.casaGet<any>('super-admin/access-log?limit=100')
      ]);

      if (securityRes.success && securityRes.data?.data) {
        setSecurityLogs(securityRes.data.data);
      }
      if (accessRes.success && accessRes.data?.data) {
        setAccessLogs(accessRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('Access denied. Super admin privileges required.');
      } else {
        setError('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Audit Logs...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <Link href="/auth/login" className="text-purple-400 hover:text-purple-300">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Link href="/super-admin" className="text-purple-400 hover:text-purple-300">
            Back to Super Admin
          </Link>
        </div>
      </div>
    );
  }

  const currentLogs = activeTab === 'security' ? securityLogs : accessLogs;

  return (
    <>
      <Head>
        <title>Audit Logs - Super Admin - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 shadow-lg border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/super-admin" className="text-gray-400 hover:text-white">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                  <p className="text-sm text-gray-400">Security and access monitoring</p>
                </div>
              </div>
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Security Log ({securityLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('access')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'access'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Access Log ({accessLogs.length})
            </button>
          </div>

          {/* Log Table */}
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            {currentLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="h-12 w-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No {activeTab} logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Details
                      </th>
                      {activeTab === 'security' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          IP Address
                        </th>
                      )}
                      {activeTab === 'access' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Resource
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {currentLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(log.timestamp || log.time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.action?.includes('fail') || log.action?.includes('denied')
                              ? 'bg-red-900 text-red-200'
                              : log.action?.includes('success') || log.action?.includes('granted')
                              ? 'bg-green-900 text-green-200'
                              : 'bg-blue-900 text-blue-200'
                          }`}>
                            {log.action || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {log.user_email || log.email || `User #${log.user_id}` || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 max-w-md truncate">
                          {log.details || '-'}
                        </td>
                        {activeTab === 'security' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {log.ip || '-'}
                          </td>
                        )}
                        {activeTab === 'access' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {log.resource_type ? `${log.resource_type} #${log.resource_id}` : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Security Events</p>
              <p className="text-2xl font-bold text-white">{securityLogs.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Access Events</p>
              <p className="text-2xl font-bold text-white">{accessLogs.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Last Updated</p>
              <p className="text-lg font-medium text-white">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
