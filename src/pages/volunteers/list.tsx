import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';

interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  background_check_status: 'pending' | 'approved' | 'rejected';
  training_status: 'pending' | 'in_progress' | 'completed';
  cases_assigned: number;
  hours_per_month: number;
  date_registered: string;
  last_contact: string;
  preferred_age_groups: string[];
  case_type_preferences: string[];
  languages_spoken: string;
  availability_weekdays: boolean;
  availability_evenings: boolean;
  availability_weekends: boolean;
}

// Volunteers will be loaded from API

export default function VolunteerList() {
  const { user, loading } = useRequireAuth();
  const { hasRole } = usePermissions();

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load volunteers from API
  useEffect(() => {
    const loadVolunteers = async () => {
      try {
        setIsLoadingVolunteers(true);
        setApiError(null);
        const response = await apiClient.casaGet('volunteers');
        if (response.success && response.data) {
          // Handle nested API response structure and map fields
          const apiData = response.data as any;
          if (apiData.success && apiData.data && apiData.data.volunteers) {
            const volunteers = apiData.data.volunteers.map((v: any) => ({
              id: v.id,
              first_name: v.first_name,
              last_name: v.last_name,
              email: v.email,
              phone: v.phone,
              status: v.volunteer_status || 'pending', // Map volunteer_status to status
              background_check_status: v.background_check_status || 'pending',
              training_status: v.training_status || 'pending',
              cases_assigned: parseInt(v.assigned_cases_count) || 0,
              hours_per_month: 0, // Default since not in API
              date_registered: v.created_at,
              last_contact: v.updated_at,
              preferred_age_groups: [], // Default since not in API
              case_type_preferences: [], // Default since not in API
              languages_spoken: v.languages_spoken || '',
              availability_weekdays: true, // Default since not in API
              availability_evenings: false, // Default since not in API
              availability_weekends: false, // Default since not in API
            }));
            setVolunteers(volunteers);
          } else {
            setVolunteers([]);
          }
        }
      } catch (error: any) {
        console.error('Failed to load volunteers:', error);
        setApiError(error?.message || 'Failed to load volunteers');
        // Set empty array to prevent render errors
        setVolunteers([]);
      } finally {
        setIsLoadingVolunteers(false);
      }
    };

    if (user) {
      loadVolunteers();
    }
  }, [user]);

  // Filter volunteers
  useEffect(() => {
    let filtered = volunteers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(volunteer =>
        `${volunteer.first_name} ${volunteer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        volunteer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(volunteer => volunteer.status === statusFilter);
    }

    setFilteredVolunteers(filtered);
  }, [volunteers, searchTerm, statusFilter]);

  if (loading || isLoadingVolunteers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Permission gate AFTER hooks are declared to avoid hook order changes
  if (!hasRole(['administrator', 'supervisor', 'casa_administrator', 'casa_supervisor'])) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600">You do not have permission to access volunteer management. Only administrators and supervisors can manage volunteers.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleDeleteVolunteer = async (volunteerId: string, volunteerName: string) => {
    if (!confirm(`Are you sure you want to delete volunteer ${volunteerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiClient.casaDelete(`volunteers/${volunteerId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete volunteer');
      }

      // Remove volunteer from local state
      setVolunteers(volunteers.filter(v => v.id !== volunteerId));
      setFilteredVolunteers(filteredVolunteers.filter(v => v.id !== volunteerId));

      alert('Volunteer deleted successfully');

    } catch (error: any) {
      console.error('Failed to delete volunteer:', error);
      alert('Failed to delete volunteer. Please try again.');
    }
  };

  const handleVolunteerAction = async (volunteerId: string, action: 'activate' | 'deactivate' | 'assign_case' | 'remove_case') => {
    try {
      const response = await apiClient.casaPost(`volunteers/${volunteerId}/${action}`, {
        organization_id: user?.organizationId,
      });

      if (!response.success) {
        throw new Error(response.error || `Failed to ${action} volunteer`);
      }

      // Update local state (in real app, would refresh from API)
      setVolunteers(volunteers.map(v => 
        v.id === volunteerId 
          ? { 
              ...v, 
              status: action === 'activate' ? 'active' : action === 'deactivate' ? 'inactive' : v.status,
              cases_assigned: action === 'assign_case' ? v.cases_assigned + 1 : action === 'remove_case' ? Math.max(0, v.cases_assigned - 1) : v.cases_assigned
            }
          : v
      ));

      alert(`Volunteer ${action.replace('_', ' ')} successful`);

    } catch (error) {
      console.error(`Failed to ${action} volunteer:`, error);
      alert(`Failed to ${action.replace('_', ' ')} volunteer. Please try again.`);
    }
  };

  const openVolunteerModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedVolunteer(null);
    setShowModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBackgroundCheckColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrainingColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>Volunteer Management - CASA Case Management</title>
        <meta name="description" content="Manage CASA volunteers" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-primary">
        {/* Header Navigation */}
        <Navigation currentPage="/volunteers/list" />

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-fintech-bg-secondary dark:to-fintech-bg-tertiary text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Volunteer Management</h1>
              <p className="text-blue-100 text-lg">Manage your CASA volunteer team</p>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="bg-white dark:bg-fintech-bg-secondary shadow-sm border-b border-gray-200 dark:border-fintech-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link
                href="/volunteers/register"
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 dark:text-fintech-text-secondary hover:text-gray-700 dark:hover:text-fintech-text-primary font-medium text-sm"
              >
                Register Volunteer
              </Link>
              <Link
                href="/volunteers/list"
                className="py-4 px-1 border-b-2 border-blue-500 dark:border-fintech-accent-blue text-blue-600 dark:text-fintech-accent-blue font-medium text-sm"
              >
                Volunteer List
              </Link>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Search */}
          <div className="bg-white dark:bg-fintech-bg-secondary p-6 rounded-lg shadow-sm dark:shadow-fintech mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Volunteers</label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div className="sm:w-48 flex items-end">
                <Link
                  href="/volunteers/register"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                >
                  Add New Volunteer
                </Link>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white dark:bg-fintech-bg-secondary p-6 rounded-lg shadow-sm dark:shadow-fintech">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 dark:bg-fintech-glow-green rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-fintech-gain font-semibold">✓</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary">Active Volunteers</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                    {volunteers.filter(v => v.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-secondary p-6 rounded-lg shadow-sm dark:shadow-fintech">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 dark:text-fintech-warning font-semibold">⏳</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                    {volunteers.filter(v => v.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-secondary p-6 rounded-lg shadow-sm dark:shadow-fintech">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-fintech-glow-blue rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-fintech-accent-blue font-semibold">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary">Total Cases</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                    {volunteers.reduce((sum, v) => sum + v.cases_assigned, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-fintech-bg-secondary p-6 rounded-lg shadow-sm dark:shadow-fintech">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center">
                    <span className="text-purple-600 dark:text-fintech-accent-indigo font-semibold">⏰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-fintech-text-secondary">Total Hours/Month</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                    {volunteers.reduce((sum, v) => sum + v.hours_per_month, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Volunteer List */}
          <div className="bg-white dark:bg-fintech-bg-secondary rounded-lg shadow-sm dark:shadow-fintech">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-fintech-border-subtle">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                Volunteers ({filteredVolunteers.length})
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-fintech-border-subtle">
                <thead className="bg-gray-50 dark:bg-fintech-bg-tertiary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Volunteer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Background Check
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Training
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Cases
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Last Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-fintech-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-fintech-bg-secondary divide-y divide-gray-200 dark:divide-fintech-border-subtle">
                  {filteredVolunteers.map((volunteer) => (
                    <tr key={volunteer.id} className="hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-fintech-bg-tertiary flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700 dark:text-fintech-accent-blue">
                                {volunteer.first_name[0]}{volunteer.last_name[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary">
                              {volunteer.first_name} {volunteer.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-fintech-text-secondary">{volunteer.email}</div>
                            <div className="text-sm text-gray-500 dark:text-fintech-text-secondary">{volunteer.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(volunteer.status)}`}>
                          {volunteer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBackgroundCheckColor(volunteer.background_check_status)}`}>
                          {volunteer.background_check_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrainingColor(volunteer.training_status)}`}>
                          {volunteer.training_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {volunteer.cases_assigned}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {volunteer.last_contact}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openVolunteerModal(volunteer)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          {volunteer.status === 'active' ? (
                            <button
                              onClick={() => handleVolunteerAction(volunteer.id, 'deactivate')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVolunteerAction(volunteer.id, 'activate')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteVolunteer(volunteer.id, `${volunteer.first_name} ${volunteer.last_name}`)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Volunteer Detail Modal */}
      {showModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedVolunteer.first_name} {selectedVolunteer.last_name}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Information</label>
                    <div className="text-sm text-gray-900">
                      <p>Email: {selectedVolunteer.email}</p>
                      <p>Phone: {selectedVolunteer.phone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration</label>
                    <div className="text-sm text-gray-900">
                      <p>Date: {selectedVolunteer.date_registered}</p>
                      <p>Hours/Month: {selectedVolunteer.hours_per_month}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedVolunteer.status)}`}>
                      {selectedVolunteer.status}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Background Check</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBackgroundCheckColor(selectedVolunteer.background_check_status)}`}>
                      {selectedVolunteer.background_check_status}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Training</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrainingColor(selectedVolunteer.training_status)}`}>
                      {selectedVolunteer.training_status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Availability</label>
                  <div className="text-sm text-gray-900">
                    <p>Weekdays: {selectedVolunteer.availability_weekdays ? 'Yes' : 'No'}</p>
                    <p>Evenings: {selectedVolunteer.availability_evenings ? 'Yes' : 'No'}</p>
                    <p>Weekends: {selectedVolunteer.availability_weekends ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Preferences</label>
                  <div className="text-sm text-gray-900">
                    <p>Age Groups: {selectedVolunteer.preferred_age_groups.join(', ')}</p>
                    <p>Case Types: {selectedVolunteer.case_type_preferences.join(', ')}</p>
                    <p>Languages: {selectedVolunteer.languages_spoken}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={closeModal}
                    className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleVolunteerAction(selectedVolunteer.id, 'assign_case')}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Assign Case
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}