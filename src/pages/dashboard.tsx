import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';

interface DashboardStats {
  activeCases: number;
  volunteers: number;
  pendingReviews: number;
  courtHearings: number;
  recentActivity: Array<{
    date: string;
    type: string;
    description: string;
    caseId?: number;
    link?: string;
  }>;
}

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
  assigned_to_name?: string;
}

export default function Dashboard() {
  const { user, organization, loading: authLoading } = useAuth();
  const { hasRole, isAdmin } = usePermissions();
  const [stats, setStats] = useState<DashboardStats>({
    activeCases: 0,
    volunteers: 0,
    pendingReviews: 0,
    courtHearings: 0,
    recentActivity: []
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats...');
      const response = await apiClient.casaGet('dashboard-stats');
      console.log('Dashboard stats response:', response);

      if (response.success && response.data) {
        // Handle nested API response structure
        const apiData = response.data as any;
        let actualStatsData;

        if (apiData.success && apiData.data) {
          // Double-nested structure from WordPress API
          actualStatsData = apiData.data;
          console.log('Found nested stats data:', actualStatsData);
        } else if (apiData.activeCases !== undefined || apiData.volunteers !== undefined) {
          // Direct structure with expected fields
          actualStatsData = apiData;
          console.log('Found direct stats data:', actualStatsData);
        } else {
          // Fallback - try to extract from any structure
          actualStatsData = apiData;
          console.log('Using fallback stats data:', actualStatsData);
        }

        // Ensure all expected fields exist with defaults
        setStats({
          activeCases: actualStatsData.activeCases ?? actualStatsData.active_cases ?? 0,
          volunteers: actualStatsData.volunteers ?? actualStatsData.active_volunteers ?? 0,
          pendingReviews: actualStatsData.pendingReviews ?? actualStatsData.pending_reviews ?? 0,
          courtHearings: actualStatsData.courtHearings ?? actualStatsData.court_hearings ?? 0,
          recentActivity: actualStatsData.recentActivity ?? actualStatsData.recent_activity ?? []
        });
      } else {
        console.error('Dashboard stats API returned unsuccessful response:', response);
        // Keep default empty data if API fails
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Keep default empty data if API fails
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingTasks = async () => {
    try {
      console.log('Fetching upcoming tasks...');
      const response = await apiClient.casaGet('tasks/upcoming');
      console.log('Upcoming tasks response:', response);

      if (response.success && response.data) {
        const apiData = response.data as any;
        let tasksData: Task[] = [];

        if (apiData.success && apiData.data) {
          tasksData = apiData.data;
        } else if (Array.isArray(apiData)) {
          tasksData = apiData;
        }

        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const completeTask = async (taskId: number) => {
    try {
      const response = await apiClient.casaPost(`tasks/${taskId}/complete`, {});
      if (response.success) {
        // Remove the completed task from the list
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-900/30';
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
      fetchUpcomingTasks();
    }
  }, [user]);

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - CASA Case Management System</title>
        <meta name="description" content="CASA Case Management Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-fintech-bg-primary dark:to-fintech-bg-secondary">
        {/* Header Navigation */}
        <Navigation currentPage="/dashboard" />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-fintech-text-primary">
                Welcome back, {user?.firstName || 'User'}!
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-fintech-text-secondary">
                Here's what's happening with your CASA cases today.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Link href="/cases" className="bg-white dark:bg-fintech-bg-secondary overflow-hidden shadow-xl dark:shadow-fintech rounded-lg border-l-4 border-blue-500 hover:shadow-2xl dark:hover:shadow-fintech-lg hover:scale-105 transition-all duration-200 cursor-pointer block">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary truncate">Active Cases</dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">{loading ? '...' : stats.activeCases}</dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-blue-600 dark:text-fintech-accent-blue">Click to view all cases →</div>
                  </div>
                </div>
              </Link>

              <Link href="/volunteers" className="bg-white dark:bg-fintech-bg-secondary overflow-hidden shadow-xl dark:shadow-fintech rounded-lg border-l-4 border-green-500 dark:border-fintech-gain hover:shadow-2xl dark:hover:shadow-fintech-lg hover:scale-105 transition-all duration-200 cursor-pointer block">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 dark:bg-fintech-gain rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary truncate">Active Volunteers</dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">{loading ? '...' : stats.volunteers}</dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-green-600 dark:text-fintech-gain">Click to view volunteers →</div>
                  </div>
                </div>
              </Link>

              <Link href="/reports" className="bg-white dark:bg-fintech-bg-secondary overflow-hidden shadow-xl dark:shadow-fintech rounded-lg border-l-4 border-yellow-500 dark:border-fintech-warning hover:shadow-2xl dark:hover:shadow-fintech-lg hover:scale-105 transition-all duration-200 cursor-pointer block">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 dark:bg-fintech-warning rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary truncate">Pending Reviews</dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">{loading ? '...' : stats.pendingReviews}</dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-yellow-600 dark:text-fintech-warning">Click to view reports →</div>
                  </div>
                </div>
              </Link>

              <Link href="/calendar" className="bg-white dark:bg-fintech-bg-secondary overflow-hidden shadow-xl dark:shadow-fintech rounded-lg border-l-4 border-purple-500 dark:border-fintech-accent-indigo hover:shadow-2xl dark:hover:shadow-fintech-lg hover:scale-105 transition-all duration-200 cursor-pointer block">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 dark:bg-fintech-accent-indigo rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary truncate">Court Hearings</dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">{loading ? '...' : stats.courtHearings}</dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-purple-600 dark:text-fintech-accent-indigo">Click to view calendar →</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-fintech-bg-secondary shadow-xl dark:shadow-fintech rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-fintech-border-subtle">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-fintech-text-primary">Recent Activity</h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-fintech-border-subtle">
                    {loading ? (
                      <div className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-fintech-accent-blue mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-fintech-text-secondary">Loading recent activity...</p>
                      </div>
                    ) : stats.recentActivity.length > 0 ? (
                      stats.recentActivity.map((activity, index) => (
                        <Link
                          key={index}
                          href={activity.link || '#'}
                          className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors duration-150 cursor-pointer"
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600 dark:text-fintech-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary">{activity.type}</p>
                                <span className="text-xs text-gray-500 dark:text-fintech-text-tertiary">{activity.date}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-fintech-text-secondary">{activity.description}</p>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <svg className="w-5 h-5 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="px-6 py-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-fintech-text-secondary">No recent activity to display.</p>
                        <p className="text-xs text-gray-400 dark:text-fintech-text-tertiary mt-1">Activity will appear here as cases and reports are created.</p>
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-3 bg-gray-50 dark:bg-fintech-bg-tertiary">
                    <a href="#" className="text-sm font-medium text-indigo-600 dark:text-fintech-accent-blue hover:text-indigo-500">View all activity →</a>
                  </div>
                </div>
              </div>

              {/* Upcoming Tasks */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-fintech-bg-secondary shadow-xl dark:shadow-fintech rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-fintech-border-subtle flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-fintech-text-primary">Upcoming Tasks</h3>
                    <Link href="/tasks/new" className="text-sm text-indigo-600 dark:text-fintech-accent-blue hover:text-indigo-500">
                      + Add
                    </Link>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-fintech-border-subtle">
                    {tasksLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-fintech-accent-blue mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-fintech-text-secondary">Loading tasks...</p>
                      </div>
                    ) : tasks.length > 0 ? (
                      tasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => completeTask(task.id)}
                              className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 dark:border-fintech-border-subtle hover:border-green-500 dark:hover:border-fintech-gain transition-colors"
                              title="Mark as complete"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary truncate">
                                  {task.title}
                                </p>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                              {task.case_number && (
                                <p className="text-xs text-gray-500 dark:text-fintech-text-tertiary">
                                  Case: {task.case_number}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-fintech-text-tertiary mt-1">
                                Due: {formatDueDate(task.due_date)}
                                {task.due_time && ` at ${task.due_time}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-fintech-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm text-gray-500 dark:text-fintech-text-secondary">No upcoming tasks</p>
                        <p className="text-xs text-gray-400 dark:text-fintech-text-tertiary mt-1">Tasks will appear here when scheduled</p>
                      </div>
                    )}
                  </div>
                  {tasks.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 dark:bg-fintech-bg-tertiary">
                      <Link href="/tasks" className="text-sm font-medium text-indigo-600 dark:text-fintech-accent-blue hover:text-indigo-500">
                        View all tasks →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <div className="bg-white dark:bg-fintech-bg-secondary shadow-xl dark:shadow-fintech rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-fintech-border-subtle">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-fintech-text-primary">Quick Actions</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {/* New Case - Available to all roles */}
                    <Link href="/cases/intake" className="relative group bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-lg block text-center">
                      <div className="w-8 h-8 mx-auto mb-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">New Case</span>
                    </Link>
                    
                    {/* Add Volunteer - Only for administrators and supervisors */}
                    {hasRole(['administrator', 'casa_administrator', 'supervisor', 'casa_supervisor']) && (
                      <Link href="/volunteers/register" className="relative group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-lg block text-center">
                        <div className="w-8 h-8 mx-auto mb-3">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Add Volunteer</span>
                      </Link>
                    )}
                    
                    {/* Home Visit Report - Available to all roles */}
                    <Link href="/reports/home-visit" className="relative group bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-lg block text-center">
                      <div className="w-8 h-8 mx-auto mb-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Home Visit Report</span>
                    </Link>
                    
                    {/* Settings - Only for administrators */}
                    {isAdmin && (
                      <Link href="/settings" className="relative group bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg p-6 transition-all duration-200 transform hover:scale-105 shadow-lg block text-center">
                        <div className="w-8 h-8 mx-auto mb-3">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Settings</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}