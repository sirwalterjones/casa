import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useRequireAuth } from '@/hooks/useAuth';
import { apiClient } from '@/services/apiClient';

interface Case {
  id: number;
  case_number: string;
  child_first_name: string;
  child_last_name: string;
}

interface User {
  id: number;
  display_name: string;
  email: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const { user, loading } = useRequireAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'medium',
    case_id: '',
    assigned_to: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load cases for dropdown
        const casesResponse = await apiClient.casaGet('cases');
        if (casesResponse.success && casesResponse.data) {
          const casesData = casesResponse.data as any;
          if (casesData.success && casesData.data) {
            setCases(casesData.data);
          } else if (Array.isArray(casesData)) {
            setCases(casesData);
          }
        }

        // Load users for assignment dropdown
        const usersResponse = await apiClient.casaGet('volunteers');
        if (usersResponse.success && usersResponse.data) {
          const usersData = usersResponse.data as any;
          if (usersData.success && usersData.data) {
            setUsers(usersData.data.map((v: any) => ({
              id: v.user_id || v.id,
              display_name: `${v.first_name} ${v.last_name}`,
              email: v.email
            })));
          } else if (Array.isArray(usersData)) {
            setUsers(usersData.map((v: any) => ({
              id: v.user_id || v.id,
              display_name: `${v.first_name} ${v.last_name}`,
              email: v.email
            })));
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date,
        due_time: formData.due_time || null,
        priority: formData.priority,
        case_id: formData.case_id ? parseInt(formData.case_id) : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
      };

      const response = await apiClient.casaPost('tasks', payload);

      if (response.success) {
        router.push('/tasks');
      } else {
        setError('Failed to create task');
      }
    } catch (error: any) {
      console.error('Error creating task:', error);
      setError(error?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
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
        <title>New Task - CASA</title>
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        <Navigation />

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex items-center gap-4">
                <Link
                  href="/tasks"
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-3xl font-light mb-2">New Task</h1>
                  <p className="text-indigo-100 text-lg">Create a new task</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                  Task Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                  placeholder="e.g., Schedule home visit, Submit court report"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                  placeholder="Additional details about this task..."
                />
              </div>

              {/* Due Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    required
                    value={formData.due_date}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                  />
                </div>
                <div>
                  <label htmlFor="due_time" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                    Due Time (optional)
                  </label>
                  <input
                    type="time"
                    id="due_time"
                    name="due_time"
                    value={formData.due_time}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Related Case */}
              <div>
                <label htmlFor="case_id" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                  Related Case (optional)
                </label>
                <select
                  id="case_id"
                  name="case_id"
                  value={formData.case_id}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                >
                  <option value="">No related case</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} - {c.child_first_name} {c.child_last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 dark:text-fintech-text-primary">
                  Assign To (optional)
                </label>
                <select
                  id="assigned_to"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-fintech-bg-tertiary dark:border-fintech-border-subtle dark:text-fintech-text-primary"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-fintech-bg-tertiary rounded-b-lg flex justify-end gap-3">
              <Link
                href="/tasks"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-fintech-text-primary bg-white dark:bg-fintech-bg-secondary border border-gray-300 dark:border-fintech-border-subtle rounded-md hover:bg-gray-50 dark:hover:bg-fintech-bg-primary transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
