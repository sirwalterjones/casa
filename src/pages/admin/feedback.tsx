import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface Attachment {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface FeedbackItem {
  id: number;
  organization_id: number;
  submitted_by: number;
  submitter_email: string;
  submitter_name: string;
  submitter_display_name: string;
  feedback_type: 'bug' | 'suggestion' | 'question' | 'other';
  title: string;
  description: string;
  page_url: string;
  browser_info: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_review' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  admin_notes: string | null;
  attachments: Attachment[];
  resolved_by: number | null;
  resolver_display_name: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  in_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  wont_fix: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  in_review: 'Under Review',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  wont_fix: "Won't Fix",
};

const typeIcons: Record<string, string> = {
  bug: '🐛',
  suggestion: '💡',
  question: '❓',
  other: '📝',
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

export default function FeedbackAdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Status update modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadFeedback();
    }
  }, [user, statusFilter, typeFilter]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('feedback_type', typeFilter);

      const response = await apiClient.casaGet(`feedback?${params.toString()}`);
      if (response.success && response.data) {
        const data = response.data as any;
        setFeedback(data.data || data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (item: FeedbackItem) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setAdminNotes(item.admin_notes || '');
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      const response = await apiClient.casaPut(`feedback/${selectedItem.id}/status`, {
        status: newStatus,
        admin_notes: adminNotes,
      });

      if (response.success) {
        setShowStatusModal(false);
        loadFeedback();
      } else {
        setError('Failed to update status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await apiClient.casaDelete(`feedback/${id}`);
      if (response.success) {
        loadFeedback();
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete feedback');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
        <title>Feedback Management - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Feedback & Bug Reports</h1>
              <p className="text-indigo-100 text-lg">Manage user feedback and bug reports</p>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
              {error}
              <button onClick={() => setError(null)} className="float-right">&times;</button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Types</option>
                  <option value="bug">Bug Report</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="question">Question</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadFeedback}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feedback List */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Feedback Items ({feedback.length})
                  </h2>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : feedback.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-300">
                    No feedback found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {feedback.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          selectedItem?.id === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <span className="text-xl">{typeIcons[item.feedback_type]}</span>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {item.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                                By {item.submitter_display_name || item.submitter_name} • {formatDate(item.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                              {statusLabels[item.status]}
                            </span>
                            {item.priority && item.feedback_type === 'bug' && (
                              <span className={`text-xs font-medium ${priorityColors[item.priority]}`}>
                                {item.priority.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {item.description}
                        </p>
                        {item.attachments && item.attachments.length > 0 && (
                          <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-300">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {item.attachments.length} attachment{item.attachments.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedItem ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow sticky top-6">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{typeIcons[selectedItem.feedback_type]}</span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openStatusModal(selectedItem)}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() => handleDelete(selectedItem.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                      {selectedItem.title}
                    </h2>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Status & Priority */}
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[selectedItem.status]}`}>
                        {statusLabels[selectedItem.status]}
                      </span>
                      {selectedItem.feedback_type === 'bug' && (
                        <span className={`text-sm font-medium ${priorityColors[selectedItem.priority]}`}>
                          Priority: {selectedItem.priority}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedItem.description}
                      </p>
                    </div>

                    {/* Submitter Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Submitted By</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedItem.submitter_display_name || selectedItem.submitter_name}
                        <br />
                        <a href={`mailto:${selectedItem.submitter_email}`} className="text-indigo-600 dark:text-indigo-400">
                          {selectedItem.submitter_email}
                        </a>
                      </p>
                    </div>

                    {/* Page URL */}
                    {selectedItem.page_url && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page URL</h4>
                        <a
                          href={selectedItem.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 dark:text-indigo-400 break-all"
                        >
                          {selectedItem.page_url}
                        </a>
                      </div>
                    )}

                    {/* Browser Info */}
                    {selectedItem.browser_info && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Browser Info</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                          {selectedItem.browser_info}
                        </p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {selectedItem.admin_notes && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Admin Notes</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 whitespace-pre-wrap">
                          {selectedItem.admin_notes}
                        </p>
                      </div>
                    )}

                    {/* Attachments */}
                    {selectedItem.attachments && Array.isArray(selectedItem.attachments) && selectedItem.attachments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments ({selectedItem.attachments.length})</h4>
                        <div className="space-y-2">
                          {selectedItem.attachments.map((attachment, index) => {
                            const fileUrl = attachment?.file_url || '';
                            const fileName = attachment?.file_name || `Attachment ${index + 1}`;
                            const fileType = attachment?.file_type || '';

                            if (!fileUrl) {
                              return (
                                <div key={index} className="text-sm text-red-500">
                                  Attachment {index + 1}: URL missing
                                </div>
                              );
                            }

                            return (
                              <a
                                key={index}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:opacity-80 transition-opacity"
                              >
                                {fileType.startsWith('image/') ? (
                                  <img
                                    src={fileUrl}
                                    alt={fileName}
                                    className="rounded-lg max-h-48 w-full object-cover border border-gray-200 dark:border-gray-600"
                                  />
                                ) : (
                                  <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <div className="min-w-0">
                                      <span className="text-sm text-gray-700 dark:text-gray-300 block truncate">{fileName}</span>
                                      <span className="text-xs text-indigo-600 dark:text-indigo-400">Click to view</span>
                                    </div>
                                  </div>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {formatDate(selectedItem.created_at)}
                      </p>
                      {selectedItem.resolved_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Resolved: {formatDate(selectedItem.resolved_at)} by {selectedItem.resolver_display_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-300">
                  Select a feedback item to view details
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Status Update Modal */}
        {showStatusModal && selectedItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50" onClick={() => setShowStatusModal(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Update Status
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Admin Notes (will be sent to submitter)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none"
                      placeholder="Add notes about this status change..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setShowStatusModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
