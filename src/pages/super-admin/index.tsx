import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { superAdminService, SuperAdminDashboard, Organization } from '@/services/superAdminService';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to complete before checking access
    if (!authLoading) {
      checkAccess();
    }
  }, [authLoading, user]);

  const checkAccess = async () => {
    // If no user after auth is complete, redirect to login
    if (!user) {
      setLoading(false);
      setAccessChecked(true);
      return;
    }

    try {
      console.log('Checking super admin access for user:', user?.email);
      const response = await superAdminService.getDashboard();
      console.log('Super admin dashboard response:', response);
      if (response.success && response.data) {
        setDashboard(response.data);
        setIsSuperAdmin(true);
      } else {
        console.warn('Super admin access denied:', response.error);
        setError(response.error || 'Access denied. Super admin privileges required.');
        setIsSuperAdmin(false);
      }
    } catch (err: any) {
      console.error('Super admin dashboard error:', err);
      // If we get a 401 error, the user session may have expired
      // Don't show "Failed to load" - the API client will handle redirect
      if (err?.response?.status === 401) {
        console.log('Super admin access check returned 401 - session may have expired');
        return; // Let the API client interceptor handle the redirect
      }
      // For 403 (forbidden), show access denied message
      if (err?.response?.status === 403) {
        setError('Access denied. Super admin privileges required.');
        setIsSuperAdmin(false);
      } else {
        setError('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
      setAccessChecked(true);
    }
  };

  // Always show loading until both auth AND access check are complete
  if (authLoading || loading || !accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Only show auth required after access check is complete and user is still null
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

  if (error || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">{error || 'Super admin privileges required'}</p>
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Super Admin - CASA Platform</title>
        <meta name="description" content="CASA Platform Super Admin Dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Super Admin Header */}
        <header className="bg-gray-800 border-b border-purple-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <span className="text-purple-500 text-2xl mr-3">👑</span>
                <h1 className="text-xl font-bold text-white">Super Admin</h1>
                <span className="ml-3 px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
                  Platform Control
                </span>
              </div>
              <nav className="flex space-x-4">
                <Link href="/super-admin" className="text-purple-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium bg-purple-500/20">
                  Dashboard
                </Link>
                <Link href="/super-admin/organizations" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Organizations
                </Link>
                <Link href="/super-admin/users" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Users
                </Link>
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
                  Exit to App →
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Organizations"
              value={dashboard?.totals.organizations || 0}
              icon="🏢"
              color="purple"
            />
            <StatCard
              title="Total Cases"
              value={dashboard?.totals.cases || 0}
              icon="📋"
              color="blue"
            />
            <StatCard
              title="Total Volunteers"
              value={dashboard?.totals.volunteers || 0}
              icon="👥"
              color="green"
            />
            <StatCard
              title="Total Users"
              value={dashboard?.totals.users || 0}
              icon="🔑"
              color="yellow"
            />
          </div>

          {/* Organizations Table */}
          <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Organizations</h2>
              <Link
                href="/super-admin/organizations?action=new"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
              >
                + New Organization
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Volunteers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {dashboard?.organizations.map((org) => (
                    <OrganizationRow key={org.id} org={org} />
                  ))}
                  {(!dashboard?.organizations || dashboard.organizations.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No organizations found. Create your first organization to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickActionCard
              title="Create Organization"
              description="Add a new CASA organization to the platform"
              icon="🏢"
              href="/super-admin/organizations?action=new"
            />
            <QuickActionCard
              title="Manage Users"
              description="Assign users to organizations and set roles"
              icon="👤"
              href="/super-admin/users"
            />
            <QuickActionCard
              title="View Audit Log"
              description="Review super admin actions and changes"
              icon="📝"
              href="/super-admin/audit"
            />
          </div>
        </main>
      </div>
    </>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-500/20 border-purple-500/30',
    blue: 'bg-blue-500/20 border-blue-500/30',
    green: 'bg-green-500/20 border-green-500/30',
    yellow: 'bg-yellow-500/20 border-yellow-500/30',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
}

// Organization Row Component
function OrganizationRow({ org }: { org: Organization }) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    suspended: 'bg-red-500/20 text-red-400',
  };

  return (
    <tr className="hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-white">{org.name}</div>
          <div className="text-sm text-gray-500">{org.slug}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[org.status] || statusColors.inactive}`}>
          {org.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {org.cases_count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {org.volunteers_count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {org.users_count || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link href={`/super-admin/organizations/${org.id}`} className="text-purple-400 hover:text-purple-300 mr-4">
          Edit
        </Link>
        <Link href={`/dashboard?org=${org.id}`} className="text-gray-400 hover:text-gray-300">
          View As →
        </Link>
      </td>
    </tr>
  );
}

// Quick Action Card Component
function QuickActionCard({ title, description, icon, href }: { title: string; description: string; icon: string; href: string }) {
  return (
    <Link href={href} className="block">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500/50 transition-colors">
        <span className="text-3xl mb-4 block">{icon}</span>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </Link>
  );
}
