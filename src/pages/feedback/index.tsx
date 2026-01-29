import { useState, useEffect } from 'react';
import Head from 'next/head';
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
  feedback_type: 'bug' | 'suggestion' | 'question' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'in_review' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  admin_notes: string | null;
  attachments: Attachment[];
  resolved_at: string | null;
  created_at: string;
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

export default function MyFeedbackPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadMyFeedback();
    }
  }, [user]);

  const loadMyFeedback = async () => {
    setLoading(true);
    try {
      const response = await apiClient.casaGet('feedback?my_feedback=true');
      if (response.success && response.data) {
        const data = response.data as any;
        setFeedback(data.data || data || []);
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
        <title>My Feedback - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">My Feedback</h1>
              <p className="text-indigo-100 text-lg">Track the status of your submitted feedback and bug reports</p>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : feedback.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No feedback yet</h3>
              <p className="text-gray-500 dark:text-gray-300">
                Use the feedback button in the bottom right corner to submit suggestions or report bugs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{typeIcons[item.feedback_type]}</span>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                            Submitted {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[item.status]}`}>
                          {statusLabels[item.status]}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transform transition-transform ${
                            expandedId === item.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedId === item.id && (
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="pt-4 space-y-4">
                        {/* Description */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {item.description}
                          </p>
                        </div>

                        {/* Admin Notes */}
                        {item.admin_notes && (
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">
                              Response from Team
                            </h4>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400 whitespace-pre-wrap">
                              {item.admin_notes}
                            </p>
                          </div>
                        )}

                        {/* Attachments */}
                        {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Attachments ({item.attachments.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {item.attachments.map((attachment, index) => {
                                const fileUrl = attachment?.file_url || '';
                                const fileName = attachment?.file_name || `Attachment ${index + 1}`;
                                const fileType = attachment?.file_type || '';

                                if (!fileUrl) return null;

                                return (
                                  <a
                                    key={index}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block hover:opacity-80 transition-opacity"
                                    title={fileName}
                                  >
                                    {fileType.startsWith('image/') ? (
                                      <img
                                        src={fileUrl}
                                        alt={fileName}
                                        className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                      />
                                    ) : (
                                      <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Resolution Info */}
                        {item.resolved_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Resolved on {formatDate(item.resolved_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
