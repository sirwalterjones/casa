import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { superAdminService, Organization, OrganizationUser, AssignUserData } from '@/services/superAdminService';

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAccessAndFetchOrgs();
    }
  }, [user]);

  useEffect(() => {
    if (selectedOrg) {
      fetchUsersForOrg(selectedOrg);
    } else {
      setUsers([]);
    }
  }, [selectedOrg]);

  const checkAccessAndFetchOrgs = async () => {
    try {
      const dashResponse = await superAdminService.getDashboard();
      if (!dashResponse.success || !dashResponse.data?.is_super_admin) {
        setError('Access denied. Super admin privileges required.');
        setLoading(false);
        return;
      }
      setIsSuperAdmin(true);

      const response = await superAdminService.getOrganizations();
      if (response.success && response.data) {
        setOrganizations(response.data);
        // Auto-select first org if available
        if (response.data.length > 0) {
          setSelectedOrg(response.data[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForOrg = async (orgId: number) => {
    setUsersLoading(true);
    try {
      const response = await superAdminService.getOrganizationUsers(orgId);
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAssignUser = async (data: AssignUserData) => {
    try {
      const response = await superAdminService.assignUserToOrganization(data);
      if (response.success) {
        setShowAssignModal(false);
        if (selectedOrg) {
          fetchUsersForOrg(selectedOrg);
        }
        // Refresh orgs to update counts
        const orgsResponse = await superAdminService.getOrganizations();
        if (orgsResponse.success && orgsResponse.data) {
          setOrganizations(orgsResponse.data);
        }
      } else {
        setError(response.error || 'Failed to assign user');
      }
    } catch (err) {
      setError('Failed to assign user');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
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
        <title>Users - Super Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-purple-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <span className="text-purple-500 text-2xl mr-3">👑</span>
                <h1 className="text-xl font-bold text-white">Super Admin</h1>
              </div>
              <nav className="flex space-x-4">
                <Link href="/super-admin" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/super-admin/organizations" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Organizations
                </Link>
                <Link href="/super-admin/users" className="text-purple-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium bg-purple-500/20">
                  Users
                </Link>
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
                  Exit →
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-gray-400 mt-1">Manage users across all organizations</p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
            >
              + Assign User
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-md flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-white">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Organization Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase">Organizations</h3>
                </div>
                <div className="divide-y divide-gray-700">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg(org.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                        selectedOrg === org.id ? 'bg-purple-500/20 border-l-2 border-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${selectedOrg === org.id ? 'text-purple-400' : 'text-white'}`}>
                          {org.name}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                          {org.users_count || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{org.slug}</p>
                    </button>
                  ))}
                  {organizations.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No organizations yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {selectedOrg
                        ? `Users - ${organizations.find(o => o.id === selectedOrg)?.name || ''}`
                        : 'Select an Organization'
                      }
                    </h3>
                    {selectedOrg && (
                      <p className="text-sm text-gray-400 mt-1">
                        {users.length} user{users.length !== 1 ? 's' : ''} assigned
                      </p>
                    )}
                  </div>
                  {selectedOrg && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-3 py-1.5 bg-purple-600/50 text-purple-300 rounded-md hover:bg-purple-600 text-sm"
                    >
                      + Add User
                    </button>
                  )}
                </div>

                {!selectedOrg ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-5xl mb-4">👈</div>
                    <p className="text-gray-400">Select an organization from the sidebar to view its users</p>
                  </div>
                ) : usersLoading ? (
                  <div className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-5xl mb-4">👤</div>
                    <h3 className="text-lg font-semibold text-white mb-2">No Users Yet</h3>
                    <p className="text-gray-400 mb-4">This organization has no users assigned</p>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      Assign First User
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {users.map((orgUser) => (
                          <UserRow key={orgUser.id} user={orgUser} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Assign User Modal */}
        {showAssignModal && (
          <AssignUserModal
            organizations={organizations}
            selectedOrg={selectedOrg}
            onClose={() => setShowAssignModal(false)}
            onAssign={handleAssignUser}
          />
        )}
      </div>
    </>
  );
}

// User Row Component
function UserRow({ user }: { user: OrganizationUser }) {
  const roleColors: Record<string, string> = {
    admin: 'bg-purple-500/20 text-purple-400',
    supervisor: 'bg-blue-500/20 text-blue-400',
    volunteer: 'bg-green-500/20 text-green-400',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  return (
    <tr className="hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-medium">
            {user.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-white">{user.display_name || 'Unknown'}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${roleColors[user.casa_role] || roleColors.volunteer}`}>
          {user.casa_role || 'volunteer'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[user.status] || statusColors.pending}`}>
          {user.status || 'pending'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        {formatDate(user.created_at)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button className="text-purple-400 hover:text-purple-300 mr-4">
          Edit
        </button>
        <button className="text-red-400 hover:text-red-300">
          Remove
        </button>
      </td>
    </tr>
  );
}

// Assign User Modal
function AssignUserModal({
  organizations,
  selectedOrg,
  onClose,
  onAssign
}: {
  organizations: Organization[];
  selectedOrg: number | null;
  onClose: () => void;
  onAssign: (data: AssignUserData) => void;
}) {
  const [formData, setFormData] = useState<{
    email: string;
    organization_id: number;
    casa_role: 'admin' | 'supervisor' | 'volunteer';
  }>({
    email: '',
    organization_id: selectedOrg || (organizations[0]?.id || 0),
    casa_role: 'volunteer',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Email is required');
      return;
    }
    if (!formData.organization_id) {
      setError('Please select an organization');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onAssign(formData);
    } catch (err) {
      setError('Failed to assign user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Assign User to Organization</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              User Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              placeholder="user@example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              If the user doesn't exist, they will be invited to create an account.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Organization *
            </label>
            <select
              value={formData.organization_id}
              onChange={(e) => setFormData({ ...formData, organization_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              required
            >
              <option value="">Select organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Role *
            </label>
            <select
              value={formData.casa_role}
              onChange={(e) => setFormData({ ...formData, casa_role: e.target.value as 'admin' | 'supervisor' | 'volunteer' })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
            >
              <option value="volunteer">Volunteer</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Organization Admin</option>
            </select>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p><strong>Volunteer:</strong> Can view assigned cases and submit reports</p>
              <p><strong>Supervisor:</strong> Can manage volunteers and view all org cases</p>
              <p><strong>Admin:</strong> Full organization access including user management</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
