import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface Task {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  case_id?: number;
  case_number?: string;
  child_first_name?: string;
  child_last_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
}

export default function TasksPage() {
  const { user, loading } = useRequireAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = filter !== 'all' ? `?status=${filter}` : '';
        const response = await apiClient.casaGet(`tasks${params}`);

        if (response.success && response.data) {
          const tasksData = response.data as any;
          if (tasksData.success && tasksData.data) {
            setTasks(tasksData.data);
          } else if (Array.isArray(tasksData)) {
            setTasks(tasksData);
          } else {
            setTasks([]);
          }
        }
      } catch (error: any) {
        console.error('Failed to load tasks:', error);
        setError(error?.message || 'Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadTasks();
    }
  }, [user, filter]);

  const completeTask = async (taskId: number) => {
    try {
      const response = await apiClient.casaPost(`tasks/${taskId}/complete`, {});
      if (response.success) {
        setTasks(tasks.map(t =>
          t.id === taskId ? { ...t, status: 'completed' as const } : t
        ));
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await apiClient.casaDelete(`tasks/${taskId}`);
      if (response.success) {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const isOverdue = (dateStr: string, status: string) => {
    if (status === 'completed') return false;
    const dueDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <>
      <Head>
        <title>Tasks - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation />

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-light mb-2">Tasks</h1>
                  <p className="text-indigo-100 text-lg">Manage your tasks and to-dos</p>
                </div>
                <Link
                  href="/tasks/new"
                  className="inline-flex items-center px-4 py-2 bg-white text-indigo-700 rounded-md hover:bg-indigo-50 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Task
                </Link>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-fintech-text-primary">{tasks.length}</div>
              <div className="text-sm text-gray-600 dark:text-fintech-text-secondary">Total Tasks</div>
            </div>
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-600 dark:text-fintech-text-primary">{pendingCount}</div>
              <div className="text-sm text-gray-600 dark:text-fintech-text-secondary">Pending</div>
            </div>
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
              <div className="text-sm text-gray-600 dark:text-fintech-text-secondary">In Progress</div>
            </div>
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-gray-600 dark:text-fintech-text-secondary">Completed</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow mb-6">
            <div className="border-b border-gray-200 dark:border-fintech-border-subtle">
              <nav className="flex -mb-px">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'in_progress', label: 'In Progress' },
                  { key: 'completed', label: 'Completed' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      filter === tab.key
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-fintech-text-secondary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Task List */}
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-fintech-text-primary">No tasks</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-fintech-text-secondary">Get started by creating a new task.</p>
                <div className="mt-6">
                  <Link
                    href="/tasks/new"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Task
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-fintech-border-subtle">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary">
                    <div className="flex items-start gap-4">
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => completeTask(task.id)}
                          className="mt-1 flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 dark:border-fintech-border-subtle hover:border-green-500 hover:bg-green-50 transition-colors"
                          title="Mark as complete"
                        />
                      )}
                      {task.status === 'completed' && (
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded bg-green-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm font-medium ${
                            task.status === 'completed'
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900 dark:text-fintech-text-primary'
                          }`}>
                            {task.title}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {isOverdue(task.due_date, task.status) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Overdue
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-fintech-text-tertiary">
                          <span className={`flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? 'text-red-600' : ''}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Due: {formatDate(task.due_date)}
                          </span>

                          {task.case_number && (
                            <Link href={`/cases/${task.case_id}`} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {task.case_number}
                            </Link>
                          )}

                          {task.assigned_to_name && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {task.assigned_to_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tasks/${task.id}/edit`}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
