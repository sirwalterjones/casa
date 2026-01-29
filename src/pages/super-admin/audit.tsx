import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import auditService, {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogsResponse,
  AUDIT_ACTION_TYPES,
  AUDIT_SEVERITY_LEVELS,
  AUDIT_STATUS_OPTIONS,
} from '@/services/auditService';
import { apiClient } from '@/services/apiClient';

interface Organization {
  id: number;
  name: string;
  slug: string;
}

export default function SuperAdminAuditPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filters
  const [filters, setFilters] = useState<AuditLogFilters>({
    action_type: '',
    organization_id: '',
    severity: '',
    status: '',
    date_from: '',
    date_to: '',
    search: '',
  });

  // Load organizations for filter dropdown
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const res = await apiClient.casaGet<any>('super-admin/organizations');
        if (res.success && res.data?.data) {
          setOrganizations(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load organizations:', err);
      }
    };
    loadOrganizations();
  }, []);

  // Load audit logs
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await auditService.getSuperAdminLogs({
        ...filters,
        page,
        per_page: perPage,
      });

      setLogs(response.logs);
      setTotalPages(response.total_pages);
      setTotalLogs(response.total);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      if (err?.message?.includes('403') || err?.message?.includes('401')) {
        setError('Access denied. Super admin privileges required.');
      } else {
        setError(err?.message || 'Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  }, [filters, page, perPage]);

  useEffect(() => {
    if (!authLoading && user) {
      loadLogs();
    }
  }, [authLoading, user, loadLogs]);

  // Handle filter change
  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  // Handle export
  const handleExport = async () => {
    try {
      setExporting(true);
      const csvContent = await auditService.exportSuperAdminLogs(filters);
      auditService.downloadCsv(csvContent, `audit_logs_all_orgs_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export audit logs: ' + (err?.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      action_type: '',
      organization_id: '',
      severity: '',
      status: '',
      date_from: '',
      date_to: '',
      search: '',
    });
    setPage(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-900 text-blue-200',
      warning: 'bg-yellow-900 text-yellow-200',
      critical: 'bg-red-900 text-red-200',
    };
    return colors[severity] || 'bg-gray-700 text-gray-300';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-900 text-green-200',
      failure: 'bg-red-900 text-red-200',
      denied: 'bg-orange-900 text-orange-200',
    };
    return colors[status] || 'bg-gray-700 text-gray-300';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
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
                  <h1 className="text-2xl font-bold text-white">Comprehensive Audit Logs</h1>
                  <p className="text-sm text-gray-400">All system activity across all organizations</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  onClick={loadLogs}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Email, resource, action..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Organization</label>
                <select
                  value={filters.organization_id || ''}
                  onChange={(e) => handleFilterChange('organization_id', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Organizations</option>
                  <option value="null">System (No Org)</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Action Type</label>
                <select
                  value={filters.action_type || ''}
                  onChange={(e) => handleFilterChange('action_type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Types</option>
                  {AUDIT_ACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Severity</label>
                <select
                  value={filters.severity || ''}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Severities</option>
                  {AUDIT_SEVERITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Statuses</option>
                  {AUDIT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Results</p>
              <p className="text-2xl font-bold text-white">{totalLogs.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Current Page</p>
              <p className="text-2xl font-bold text-white">{page} of {totalPages}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Organizations</p>
              <p className="text-2xl font-bold text-white">{organizations.length}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Last Updated</p>
              <p className="text-lg font-medium text-white">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Log Table */}
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="h-12 w-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No audit logs found matching your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        IP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {logs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr
                          className="hover:bg-gray-750 cursor-pointer"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            {log.organization_name || 'System'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                            <div>{log.user_email}</div>
                            <div className="text-xs text-gray-500">{log.user_role}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">{auditService.formatAction(log.action)}</div>
                            <div className="text-xs text-gray-500">{auditService.formatActionType(log.action_type)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                            {log.resource_type && (
                              <span>
                                {log.resource_type}
                                {log.resource_identifier && `: ${log.resource_identifier}`}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${getSeverityBadge(log.severity)}`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                            {log.ip_address}
                          </td>
                        </tr>
                        {expandedRow === log.id && (
                          <tr className="bg-gray-850">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {log.old_values && (
                                  <div>
                                    <p className="text-gray-400 font-medium mb-2">Previous Values:</p>
                                    <pre className="bg-gray-900 p-3 rounded text-gray-300 overflow-auto max-h-40 text-xs">
                                      {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_values && (
                                  <div>
                                    <p className="text-gray-400 font-medium mb-2">New Values:</p>
                                    <pre className="bg-gray-900 p-3 rounded text-gray-300 overflow-auto max-h-40 text-xs">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.metadata && (
                                  <div>
                                    <p className="text-gray-400 font-medium mb-2">Metadata:</p>
                                    <pre className="bg-gray-900 p-3 rounded text-gray-300 overflow-auto max-h-40 text-xs">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                <div>
                                  <p className="text-gray-400 font-medium mb-2">Request Details:</p>
                                  <p className="text-gray-300">User Agent: <span className="text-gray-500 text-xs">{log.user_agent || 'N/A'}</span></p>
                                  <p className="text-gray-300">Request URI: <span className="text-gray-500">{log.request_uri || 'N/A'}</span></p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, totalLogs)} of {totalLogs} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
