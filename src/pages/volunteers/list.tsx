import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';
import { caseService } from '@/services/caseService';
import { useToast } from '@/components/common/Toast';

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

interface Case {
  id: number;
  case_number: string;
  child_name: string;
  status: string;
  assigned_volunteer_id?: number;
  assigned_volunteer_name?: string;
}

export default function VolunteerList() {
  const { user, loading } = useRequireAuth();
  const { hasRole } = usePermissions();
  const { showToast } = useToast();

  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState<Volunteer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isLoadingVolunteers, setIsLoadingVolunteers] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Load volunteers and cases from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingVolunteers(true);

        // Load volunteers
        const response = await apiClient.casaGet('volunteers');
        if (response.success && response.data) {
          const apiData = response.data as any;
          if (apiData.success && apiData.data && apiData.data.volunteers) {
            const volunteers = apiData.data.volunteers.map((v: any) => ({
              id: v.id,
              first_name: v.first_name,
              last_name: v.last_name,
              email: v.email,
              phone: v.phone,
              status: v.volunteer_status || v.status || 'pending',
              background_check_status: v.background_check_status || 'pending',
              training_status: v.training_status || 'pending',
              cases_assigned: parseInt(v.assigned_cases_count) || 0,
              hours_per_month: 0,
              date_registered: v.created_at,
              last_contact: v.updated_at,
              preferred_age_groups: [],
              case_type_preferences: [],
              languages_spoken: v.languages_spoken || '',
              availability_weekdays: true,
              availability_evenings: false,
              availability_weekends: false,
            }));
            setVolunteers(volunteers);
          }
        }

        // Load cases for assignment
        const casesResponse = await caseService.getCases({ limit: 100 });
        if (casesResponse.success && casesResponse.data) {
          const casesData = casesResponse.data as any;
          const casesList = casesData.data?.cases || casesData.cases || [];
          setCases(casesList);
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        showToast({ type: 'error', title: 'Error', description: 'Failed to load volunteers' });
      } finally {
        setIsLoadingVolunteers(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Filter volunteers
  useEffect(() => {
    let filtered = volunteers;

    if (searchTerm) {
      filtered = filtered.filter(volunteer =>
        `${volunteer.first_name} ${volunteer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        volunteer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(volunteer => volunteer.status === statusFilter);
    }

    setFilteredVolunteers(filtered);
  }, [volunteers, searchTerm, statusFilter]);

  const handleAssignCase = async () => {
    if (!selectedVolunteer || !selectedCaseId) {
      showToast({ type: 'warning', title: 'Selection Required', description: 'Please select a case to assign.' });
      return;
    }

    setIsAssigning(true);
    try {
      const response = await caseService.updateCase(parseInt(selectedCaseId), {
        assigned_volunteer_id: parseInt(selectedVolunteer.id),
        assignment_date: new Date().toISOString().split('T')[0]
      });

      if (response.success) {
        showToast({ type: 'success', title: 'Success', description: 'Case assigned successfully!' });
        setShowAssignModal(false);
        setSelectedCaseId('');

        // Update volunteer's case count locally
        setVolunteers(volunteers.map(v =>
          v.id === selectedVolunteer.id
            ? { ...v, cases_assigned: v.cases_assigned + 1 }
            : v
        ));

        // Update cases list
        setCases(cases.map(c =>
          c.id === parseInt(selectedCaseId)
            ? { ...c, assigned_volunteer_id: parseInt(selectedVolunteer.id), assigned_volunteer_name: `${selectedVolunteer.first_name} ${selectedVolunteer.last_name}` }
            : c
        ));
      } else {
        throw new Error(response.error || 'Failed to assign case');
      }
    } catch (error: any) {
      console.error('Failed to assign case:', error);
      showToast({ type: 'error', title: 'Error', description: 'Failed to assign case. Please try again.' });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleVolunteerAction = async (volunteerId: string, action: 'activate' | 'deactivate') => {
    try {
      const response = await apiClient.casaPost(`volunteers/${volunteerId}/${action}`, {});

      if (response.success) {
        setVolunteers(volunteers.map(v =>
          v.id === volunteerId
            ? { ...v, status: action === 'activate' ? 'active' : 'inactive' }
            : v
        ));
        showToast({ type: 'success', title: 'Success', description: `Volunteer ${action}d successfully!` });
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error', description: `Failed to ${action} volunteer.` });
    }
  };

  const handleDeleteVolunteer = async (volunteerId: string, volunteerName: string) => {
    if (!confirm(`Are you sure you want to delete volunteer ${volunteerName}?`)) {
      return;
    }

    try {
      const response = await apiClient.casaDelete(`volunteers/${volunteerId}`);
      if (response.success) {
        setVolunteers(volunteers.filter(v => v.id !== volunteerId));
        showToast({ type: 'success', title: 'Deleted', description: 'Volunteer deleted successfully.' });
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error', description: 'Failed to delete volunteer.' });
    }
  };

  const openVolunteerModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowModal(true);
  };

  const openAssignModal = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setSelectedCaseId('');
    setShowAssignModal(true);
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      case 'pending': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'inactive': return { bg: 'bg-gray-100', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' };
      case 'suspended': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' };
    }
  };

  const getCheckStyles = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'pending':
      case 'in_progress': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'rejected': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      default: return { bg: 'bg-gray-50 dark:bg-fintech-bg-secondary', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-600' };
    }
  };

  const unassignedCases = cases.filter(c => !c.assigned_volunteer_id && c.status === 'active');

  if (loading || isLoadingVolunteers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-secondary dark:bg-fintech-bg-primary">
        <Navigation currentPage="/volunteers/list" />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300 text-lg">Loading volunteers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasRole(['administrator', 'supervisor', 'casa_administrator', 'casa_supervisor', 'casa_super_admin'])) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-fintech-bg-secondary dark:bg-fintech-bg-primary">
        <Navigation currentPage="/volunteers/list" />
        <div className="max-w-7xl mx-auto py-12 px-4">
          <div className="bg-white dark:bg-fintech-bg-card rounded-2xl shadow-sm dark:border dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-300">You don't have permission to manage volunteers.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Volunteer Management - CASA</title>
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-fintech-bg-primary">
        <Navigation currentPage="/volunteers/list" />

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-700 dark:via-indigo-700 dark:to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Volunteer Management</h1>
                  <p className="text-blue-100 text-lg">
                    {volunteers.filter(v => v.status === 'active').length} active volunteers
                  </p>
                </div>
                <Link
                  href="/volunteers/register"
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  + Add Volunteer
                </Link>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{volunteers.filter(v => v.status === 'active').length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{volunteers.filter(v => v.status === 'pending').length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{volunteers.reduce((sum, v) => sum + v.cases_assigned, 0)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Cases Assigned</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{volunteers.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search volunteers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-fintech-bg-secondary dark:text-white"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-fintech-bg-secondary dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Volunteer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVolunteers.map((volunteer) => {
              const statusStyles = getStatusStyles(volunteer.status);
              const bgStyles = getCheckStyles(volunteer.background_check_status);
              const trainingStyles = getCheckStyles(volunteer.training_status);

              return (
                <div key={volunteer.id} className="bg-white dark:bg-fintech-bg-card rounded-2xl shadow-sm dark:border dark:border-gray-700 border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                          {volunteer.first_name[0]}{volunteer.last_name[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {volunteer.first_name} {volunteer.last_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-300">{volunteer.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles.bg} ${statusStyles.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`}></span>
                        {volunteer.status.charAt(0).toUpperCase() + volunteer.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Contact */}
                    <div className="flex items-center gap-3 text-sm">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-300">{volunteer.phone || 'No phone'}</span>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${bgStyles.bg} ${bgStyles.text} ${bgStyles.border}`}>
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        BG: {volunteer.background_check_status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${trainingStyles.bg} ${trainingStyles.text} ${trainingStyles.border}`}>
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Training: {volunteer.training_status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Cases */}
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-fintech-bg-secondary rounded-xl">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Cases Assigned</span>
                      <span className="text-lg font-bold text-indigo-600">{volunteer.cases_assigned}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-5 pb-5 flex gap-2">
                    <button
                      onClick={() => openVolunteerModal(volunteer)}
                      className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openAssignModal(volunteer)}
                      className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Assign Case
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredVolunteers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No volunteers found</h3>
              <p className="text-gray-500 dark:text-gray-300 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </main>

        {/* Volunteer Detail Modal */}
        {showModal && selectedVolunteer && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowModal(false)}>
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"></div>
              <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {selectedVolunteer.first_name[0]}{selectedVolunteer.last_name[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedVolunteer.first_name} {selectedVolunteer.last_name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-300">{selectedVolunteer.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-fintech-bg-secondary rounded-full"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-fintech-bg-secondary rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">Phone</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{selectedVolunteer.phone || 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-fintech-bg-secondary rounded-xl">
                      <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">Registered</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedVolunteer.date_registered).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border ${getStatusStyles(selectedVolunteer.status).bg}`}>
                      <p className="text-sm opacity-75 mb-1">Status</p>
                      <p className={`font-semibold capitalize ${getStatusStyles(selectedVolunteer.status).text}`}>
                        {selectedVolunteer.status}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl border ${getCheckStyles(selectedVolunteer.background_check_status).bg} ${getCheckStyles(selectedVolunteer.background_check_status).border}`}>
                      <p className="text-sm opacity-75 mb-1">Background</p>
                      <p className={`font-semibold capitalize ${getCheckStyles(selectedVolunteer.background_check_status).text}`}>
                        {selectedVolunteer.background_check_status}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl border ${getCheckStyles(selectedVolunteer.training_status).bg} ${getCheckStyles(selectedVolunteer.training_status).border}`}>
                      <p className="text-sm opacity-75 mb-1">Training</p>
                      <p className={`font-semibold capitalize ${getCheckStyles(selectedVolunteer.training_status).text}`}>
                        {selectedVolunteer.training_status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Availability</h4>
                    <div className="flex gap-3">
                      <span className={`px-4 py-2 rounded-xl text-sm font-medium ${selectedVolunteer.availability_weekdays ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        Weekdays
                      </span>
                      <span className={`px-4 py-2 rounded-xl text-sm font-medium ${selectedVolunteer.availability_evenings ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        Evenings
                      </span>
                      <span className={`px-4 py-2 rounded-xl text-sm font-medium ${selectedVolunteer.availability_weekends ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        Weekends
                      </span>
                    </div>
                  </div>

                  {/* Languages */}
                  {selectedVolunteer.languages_spoken && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Languages</h4>
                      <p className="text-gray-600 dark:text-gray-300">{selectedVolunteer.languages_spoken}</p>
                    </div>
                  )}

                  {/* Cases Info */}
                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-600">Currently Assigned</p>
                        <p className="text-2xl font-bold text-indigo-700">{selectedVolunteer.cases_assigned} cases</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowModal(false);
                          openAssignModal(selectedVolunteer);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                      >
                        + Assign New Case
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 dark:bg-fintech-bg-secondary px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-fintech-bg-secondary transition-colors"
                  >
                    Close
                  </button>
                  {selectedVolunteer.status === 'active' ? (
                    <button
                      onClick={() => {
                        handleVolunteerAction(selectedVolunteer.id, 'deactivate');
                        setShowModal(false);
                      }}
                      className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleVolunteerAction(selectedVolunteer.id, 'activate');
                        setShowModal(false);
                      }}
                      className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDeleteVolunteer(selectedVolunteer.id, `${selectedVolunteer.first_name} ${selectedVolunteer.last_name}`);
                      setShowModal(false);
                    }}
                    className="px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Case Modal */}
        {showAssignModal && selectedVolunteer && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowAssignModal(false)}>
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"></div>
              <div
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Case</h2>
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-fintech-bg-secondary rounded-full"
                    >
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-300 mb-2">Assigning to:</p>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-fintech-bg-secondary rounded-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {selectedVolunteer.first_name[0]}{selectedVolunteer.last_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {selectedVolunteer.first_name} {selectedVolunteer.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-300">{selectedVolunteer.cases_assigned} current cases</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Case to Assign</label>
                    {unassignedCases.length > 0 ? (
                      <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-fintech-bg-secondary dark:text-white"
                      >
                        <option value="">Choose a case...</option>
                        {unassignedCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.case_number} - {c.child_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-amber-700 font-medium">No unassigned cases available</p>
                        <p className="text-sm text-amber-600 mt-1">All active cases have been assigned.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAssignModal(false)}
                      className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:bg-fintech-bg-secondary dark:hover:bg-fintech-bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignCase}
                      disabled={!selectedCaseId || isAssigning}
                      className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAssigning ? 'Assigning...' : 'Assign Case'}
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
