import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { superAdminService, Organization, CreateOrganizationData } from '@/services/superAdminService';

export default function OrganizationsPage() {
  const router = useRouter();
  const { action } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (action === 'new') {
      setShowCreateModal(true);
    }
  }, [action]);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      const response = await superAdminService.getOrganizations();
      if (response.success && response.data) {
        setOrganizations(response.data);
      } else {
        setError(response.error || 'Failed to fetch organizations');
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (data: CreateOrganizationData) => {
    try {
      const response = await superAdminService.createOrganization(data);
      if (response.success) {
        setShowCreateModal(false);
        fetchOrganizations();
        router.push('/super-admin/organizations');
      } else {
        setError(response.error || 'Failed to create organization');
      }
    } catch (err) {
      setError('Failed to create organization');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Organizations - Super Admin</title>
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
                <Link href="/super-admin/organizations" className="text-purple-400 hover:text-white px-3 py-2 rounded-md text-sm font-medium bg-purple-500/20">
                  Organizations
                </Link>
                <Link href="/super-admin/users" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
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
              <h2 className="text-2xl font-bold text-white">Organizations</h2>
              <p className="text-gray-400 mt-1">Manage all CASA organizations on the platform</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
            >
              + New Organization
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Organizations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <OrganizationCard key={org.id} org={org} onRefresh={fetchOrganizations} />
            ))}
            {organizations.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Organizations Yet</h3>
                <p className="text-gray-400 mb-6">Create your first organization to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                >
                  Create First Organization
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Create Organization Modal */}
        {showCreateModal && (
          <CreateOrganizationModal
            onClose={() => {
              setShowCreateModal(false);
              router.push('/super-admin/organizations');
            }}
            onCreate={handleCreateOrganization}
          />
        )}
      </div>
    </>
  );
}

// Organization Card Component
function OrganizationCard({ org, onRefresh }: { org: Organization; onRefresh: () => void }) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    suspended: 'bg-red-500',
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-colors">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{org.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{org.slug}</p>
          </div>
          <span className={`w-3 h-3 rounded-full ${statusColors[org.status]}`}></span>
        </div>

        {org.contact_email && (
          <p className="text-sm text-gray-400 mt-4">
            <span className="text-gray-500">Email:</span> {org.contact_email}
          </p>
        )}
        {org.phone && (
          <p className="text-sm text-gray-400">
            <span className="text-gray-500">Phone:</span> {org.phone}
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{org.cases_count || 0}</p>
            <p className="text-xs text-gray-500">Cases</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{org.volunteers_count || 0}</p>
            <p className="text-xs text-gray-500">Volunteers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{org.users_count || 0}</p>
            <p className="text-xs text-gray-500">Users</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-700/50 px-6 py-3 flex justify-between items-center">
        <Link href={`/super-admin/organizations/${org.id}`} className="text-sm text-purple-400 hover:text-purple-300">
          Edit Settings
        </Link>
        <Link href={`/super-admin/organizations/${org.id}/users`} className="text-sm text-gray-400 hover:text-gray-300">
          Manage Users
        </Link>
      </div>
    </div>
  );
}

// Create Organization Modal
function CreateOrganizationModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: CreateOrganizationData) => void }) {
  const [formData, setFormData] = useState<CreateOrganizationData>({
    name: '',
    slug: '',
    contact_email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Organization name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreate(formData);
    } catch (err) {
      setError('Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: formData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Create New Organization</h3>
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
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              placeholder="e.g., Bartow County CASA"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              URL Slug
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">app.casaplatform.com/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
                placeholder="bartow-casa"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              placeholder="admin@organization.org"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-purple-500"
              placeholder="123 Main St, City, State 12345"
              rows={2}
            />
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
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
