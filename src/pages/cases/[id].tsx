import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import { apiClient } from '@/services/apiClient';

interface CaseDetails {
  id: string;
  case_number: string;
  child_first_name: string;
  child_last_name: string;
  child_dob: string;
  case_type: string;
  status: string;
  priority: string;
  referral_date: string;
  case_summary: string;
  court_jurisdiction: string;
  assigned_judge: string;
  placement_type: string;
  placement_address: string;
  assigned_volunteer_id: string | null;
  assignment_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

interface ContactLog {
  id: string;
  case_number: string;
  contact_type: string;
  contact_date: string;
  contact_duration: string;
  contact_person: string;
  contact_notes: string;
  follow_up_required: string;
  follow_up_notes: string;
  created_by: string;
  created_at: string;
  child_first_name: string;
  child_last_name: string;
  volunteer_name: string;
}

interface CaseDocument {
  id: string;
  case_number: string;
  document_type: string;
  document_name: string;
  file_name: string;
  upload_date: string;
  uploaded_by: string;
  description: string;
  is_confidential: boolean;
}

interface CourtHearing {
  id: string;
  case_number: string;
  hearing_date: string;
  hearing_time: string;
  hearing_type: string;
  court_room: string;
  judge_name: string;
  status: string;
  notes: string;
}

interface HomeVisitReport {
  id: string;
  case_number: string;
  visit_date: string;
  visit_summary: string;
  child_physical_appearance: string;
  child_mood: string;
  home_condition: string;
  concerns_identified: string;
  recommendations: string;
  created_by: string;
  created_at: string;
}

interface CourtReport {
  id: string;
  case_number: string;
  hearing_date: string;
  hearing_type: string;
  hearing_summary: string;
  court_orders: string;
  casa_recommendations: string;
  next_hearing_date: string;
  created_by: string;
  created_at: string;
}

// Note: Mock data removed - all data now comes from the API

export default function CaseDetail() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([]);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [courtHearings, setCourtHearings] = useState<CourtHearing[]>([]);
  const [homeVisitReports, setHomeVisitReports] = useState<HomeVisitReport[]>([]);
  const [courtReports, setCourtReports] = useState<CourtReport[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CaseDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [assignedVolunteerName, setAssignedVolunteerName] = useState<string | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(true);
  
  // Contact log editing states
  const [selectedContactLog, setSelectedContactLog] = useState<ContactLog | null>(null);
  const [isViewingContact, setIsViewingContact] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactEditData, setContactEditData] = useState<ContactLog | null>(null);
  
  // Home visit editing states
  const [selectedHomeVisit, setSelectedHomeVisit] = useState<HomeVisitReport | null>(null);
  const [isViewingHomeVisit, setIsViewingHomeVisit] = useState(false);
  const [isEditingHomeVisit, setIsEditingHomeVisit] = useState(false);
  const [homeVisitEditData, setHomeVisitEditData] = useState<HomeVisitReport | null>(null);

  useEffect(() => {
    const loadCaseData = async () => {
      if (!id || !user) return;

      // Reset state for new case and show loading
      setIsLoadingCase(true);
      setCaseDetails(null);

      try {
        // Load case details using the individual case endpoint
        console.log('Loading case details for ID:', id);
        const caseResponse = await apiClient.casaGet(`cases/${id}`);
        console.log('Case details API response:', caseResponse);
        
        let caseNumber = null; // Store case number for filtering documents
        
        if (caseResponse.success && caseResponse.data) {
          console.log('Setting case details:', caseResponse.data);
          console.log('Case details structure:', Object.keys(caseResponse.data));
          
          // Handle nested API response structure
          const apiData = caseResponse.data as any;
          let actualCaseData;
          
          if (apiData.success && apiData.data) {
            // Double-nested structure from WordPress API
            actualCaseData = apiData.data;
            console.log('Found nested case data:', actualCaseData);
          } else {
            // Direct structure
            actualCaseData = apiData;
            console.log('Found direct case data:', actualCaseData);
          }
          
          console.log('Case number from response:', actualCaseData.case_number);
          console.log('Child first name from response:', actualCaseData.child_first_name);
          console.log('About to call setCaseDetails with:', actualCaseData);
          setCaseDetails(actualCaseData);
          caseNumber = actualCaseData.case_number; // Store for document filtering
          console.log('setCaseDetails called successfully');

          // Set volunteer name from case data if available
          if (actualCaseData.assigned_volunteer_name) {
            setAssignedVolunteerName(actualCaseData.assigned_volunteer_name);
          } else if (actualCaseData.assigned_volunteer_id) {
            setAssignedVolunteerName('Assigned Volunteer');
          } else {
            setAssignedVolunteerName(null);
          }
        } else {
          console.error('Case not found, response:', caseResponse);
          setCaseDetails(null);
        }

        // Load related data in parallel
        const [contactsResponse, documentsResponse, hearingsResponse, homeVisitsResponse] = await Promise.all([
          apiClient.casaGet(`contact-logs?case_id=${id}`),
          apiClient.casaGet('documents'), // Load all documents, then filter by case_number
          apiClient.casaGet(`court-hearings?case_id=${id}`),
          apiClient.casaGet(`home-visit-reports?case_id=${id}`)
        ]);

        // Process contact logs
        console.log('Contact logs API response:', contactsResponse);
        if (contactsResponse.success && contactsResponse.data) {
          const contactsData = contactsResponse.data as any;
          console.log('Contact logs data structure:', contactsData);
          if (contactsData.success && contactsData.data) {
            console.log('Setting contact logs:', contactsData.data);
            console.log('Contact logs count:', contactsData.data.length);
            if (contactsData.data.length > 0) {
              console.log('First contact log:', contactsData.data[0]);
            }
            setContactLogs(contactsData.data || []);
          } else if (Array.isArray(contactsData)) {
            console.log('Contact logs as direct array:', contactsData);
            setContactLogs(contactsData);
          }
        }

        // Process documents
        console.log('Documents API response:', documentsResponse);
        if (documentsResponse.success && documentsResponse.data) {
          const documentsData = documentsResponse.data as any;
          console.log('Documents data structure:', documentsData);
          if (documentsData.success && documentsData.data) {
            // Filter documents for this specific case
            const filteredDocuments = documentsData.data.filter((doc: any) => 
              doc.case_number === caseNumber
            );
            console.log('Filtered documents for case', caseNumber, ':', filteredDocuments);
            setDocuments(filteredDocuments || []);
          } else if (Array.isArray(documentsData)) {
            // Handle direct array response
            const filteredDocuments = documentsData.filter((doc: any) => 
              doc.case_number === caseNumber
            );
            console.log('Documents as direct array, filtered:', filteredDocuments);
            setDocuments(filteredDocuments);
          } else {
            console.log('No documents found or invalid response structure');
            setDocuments([]);
          }
        } else {
          console.log('Failed to load documents, using empty array');
          setDocuments([]);
        }

        // Process court hearings
        console.log('Court hearings API response:', hearingsResponse);
        if (hearingsResponse.success && hearingsResponse.data) {
          const hearingsData = hearingsResponse.data as any;
          console.log('Court hearings data structure:', hearingsData);

          let hearingsArray: CourtHearing[] = [];

          // Handle multiple response structures
          if (hearingsData.success && hearingsData.data?.hearings) {
            hearingsArray = hearingsData.data.hearings;
          } else if (hearingsData.data?.hearings) {
            hearingsArray = hearingsData.data.hearings;
          } else if (hearingsData.hearings) {
            hearingsArray = hearingsData.hearings;
          } else if (hearingsData.success && Array.isArray(hearingsData.data)) {
            hearingsArray = hearingsData.data;
          } else if (Array.isArray(hearingsData.data)) {
            hearingsArray = hearingsData.data;
          } else if (Array.isArray(hearingsData)) {
            hearingsArray = hearingsData;
          }

          console.log('Parsed court hearings array:', hearingsArray);
          setCourtHearings(Array.isArray(hearingsArray) ? hearingsArray : []);
        } else {
          setCourtHearings([]);
        }

        // Process home visit reports
        console.log('Home visits API response:', homeVisitsResponse);
        if (homeVisitsResponse.success && homeVisitsResponse.data) {
          const homeVisitsData = homeVisitsResponse.data as any;
          console.log('Home visits data structure:', homeVisitsData);
          if (homeVisitsData.success && homeVisitsData.data) {
            console.log('Setting home visit reports:', homeVisitsData.data);
            setHomeVisitReports(homeVisitsData.data || []);
          } else if (Array.isArray(homeVisitsData)) {
            console.log('Home visits as direct array:', homeVisitsData);
            setHomeVisitReports(homeVisitsData);
          } else {
            setHomeVisitReports([]);
          }
        } else {
          setHomeVisitReports([]);
        }

        // Load court reports (these might not have API endpoints yet, so keep empty for now)
        setCourtReports([]);

      } catch (error) {
        console.error('Failed to load case data:', error);
        // Fallback to empty state rather than mock data
        setCaseDetails(null);
        setContactLogs([]);
        setDocuments([]);
        setCourtHearings([]);
        setHomeVisitReports([]);
        setCourtReports([]);
      } finally {
        setIsLoadingCase(false);
      }
    };

    loadCaseData();
  }, [id, user]);

  // Show loading state while auth or case data is loading
  if (loading || isLoadingCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Only show "not found" after loading is complete and case is still null
  if (!caseDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Case Not Found</h2>
          <p className="text-gray-600 mt-2">The requested case could not be found.</p>
          <Link href="/cases" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Return to Cases
          </Link>
        </div>
      </div>
    );
  }

  // Debug log to see what caseDetails contains when rendering
  console.log('Rendering with caseDetails:', caseDetails);
  console.log('Case number for display:', caseDetails?.case_number);
  console.log('Child first name for display:', caseDetails?.child_first_name);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending-review': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateComprehensiveReport = async () => {
    const reportData = {
      case: caseDetails,
      contactLogs,
      documents,
      courtHearings,
      homeVisitReports,
      courtReports,
    };
    
    try {
      // Import PDF generator dynamically to avoid SSR issues
      const { PDFGenerator } = await import('@/utils/pdfGenerator');
      await PDFGenerator.generateComprehensiveReport(reportData);
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      alert('Failed to generate comprehensive report. Please try again.');
    }
  };

  const handleEditClick = () => {
    setEditFormData({ ...caseDetails! });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditFormData(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editFormData || !id) return;

    setIsSaving(true);
    try {
      const response = await apiClient.casaPut(`cases/${id}`, editFormData);
      
      if (response.success) {
        setCaseDetails(editFormData);
        setIsEditing(false);
        setEditFormData(null);
        alert('Case updated successfully!');
      } else {
        alert('Failed to update case. Please try again.');
      }
    } catch (error) {
      console.error('Error updating case:', error);
      alert('Failed to update case. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof CaseDetails, value: string) => {
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        [field]: value
      });
    }
  };

  // Contact log handlers
  const handleViewContact = (contact: ContactLog) => {
    setSelectedContactLog(contact);
    setIsViewingContact(true);
  };

  const handleEditContact = (contact: ContactLog) => {
    setSelectedContactLog(contact);
    setContactEditData({ ...contact });
    setIsEditingContact(true);
    setIsViewingContact(false);
  };

  const handleCloseContactModal = () => {
    setSelectedContactLog(null);
    setIsViewingContact(false);
    setIsEditingContact(false);
    setContactEditData(null);
  };

  const handleSaveContactEdit = async () => {
    if (!contactEditData || !selectedContactLog) return;

    try {
      // For now, just close the modal - we'll implement the API call later
      setContactLogs(contactLogs.map(log => 
        log.id === selectedContactLog.id ? contactEditData : log
      ));
      handleCloseContactModal();
      alert('Contact log would be updated (API not implemented yet)');
    } catch (error) {
      console.error('Error updating contact log:', error);
      alert('Failed to update contact log. Please try again.');
    }
  };

  const handleContactInputChange = (field: keyof ContactLog, value: string) => {
    if (contactEditData) {
      setContactEditData({
        ...contactEditData,
        [field]: value
      });
    }
  };

  // Document handlers
  const handleViewDocument = async (document: CaseDocument) => {
    console.log('handleViewDocument called with document:', document);
    try {
      console.log('Making API call to download document:', document.id);
      const response = await apiClient.casaGet(`documents/${document.id}/download`);
      console.log('API response:', response);
      
      if (response.success && response.data) {
        const downloadData = response.data as any;
        console.log('Download data:', downloadData);
        if (downloadData.success && downloadData.data.download_url) {
          console.log('Opening URL:', downloadData.data.download_url);
          // Open the document in a new window/tab
          window.open(downloadData.data.download_url, '_blank');
        } else {
          console.log('No download URL found in response');
          alert('Document URL not available.');
        }
      } else {
        console.log('API response was not successful:', response);
        alert('Failed to get document information. Please try again.');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to view document. Please try again.');
    }
  };

  const handleDownloadDocument = async (doc: CaseDocument) => {
    console.log('handleDownloadDocument called with document:', doc);
    try {
      console.log('Making API call to download document:', doc.id);
      const response = await apiClient.casaGet(`documents/${doc.id}/download`);
      
      if (response.success && response.data) {
        const downloadData = response.data as any;
        if (downloadData.success && downloadData.data.download_url) {
          // Create a temporary link to download the file
          const link = document.createElement('a');
          link.href = downloadData.data.download_url;
          link.download = downloadData.data.file_name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert('Download URL not available for this document.');
        }
      } else {
        alert('Failed to get download information. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDeleteDocument = async (document: CaseDocument) => {
    console.log('handleDeleteDocument called with document:', document);
    if (confirm(`Are you sure you want to delete "${document.document_name}"?\n\nThis action cannot be undone and will remove the file from the server.`)) {
      try {
        console.log('Making API call to delete document:', document.id);
        const response = await apiClient.casaDelete(`documents/${document.id}`);
        
        if (response.success) {
          // Remove from local state after successful deletion
          setDocuments(documents.filter(doc => doc.id !== document.id));
          alert('Document deleted successfully!');
        } else {
          alert('Failed to delete document. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document. Please try again.');
      }
    }
  };

  // Home visit handlers
  const handleViewHomeVisit = (visit: HomeVisitReport) => {
    setSelectedHomeVisit(visit);
    setIsViewingHomeVisit(true);
  };

  const handleEditHomeVisit = (visit: HomeVisitReport) => {
    setSelectedHomeVisit(visit);
    setHomeVisitEditData({ ...visit });
    setIsEditingHomeVisit(true);
    setIsViewingHomeVisit(false);
  };

  const handleCloseHomeVisitModal = () => {
    setSelectedHomeVisit(null);
    setIsViewingHomeVisit(false);
    setIsEditingHomeVisit(false);
    setHomeVisitEditData(null);
  };

  const handleSaveHomeVisitEdit = async () => {
    if (!homeVisitEditData || !selectedHomeVisit) return;

    try {
      // For now, just close the modal - we'll implement the API call later
      setHomeVisitReports(homeVisitReports.map(visit => 
        visit.id === selectedHomeVisit.id ? homeVisitEditData : visit
      ));
      handleCloseHomeVisitModal();
      alert('Home visit report would be updated (API not implemented yet)');
    } catch (error) {
      console.error('Error updating home visit report:', error);
      alert('Failed to update home visit report. Please try again.');
    }
  };

  const handleHomeVisitInputChange = (field: keyof HomeVisitReport, value: string) => {
    if (homeVisitEditData) {
      setHomeVisitEditData({
        ...homeVisitEditData,
        [field]: value
      });
    }
  };

  // Show loading state while auth or case data is loading
  if (loading || isLoadingCase) {
    return (
      <>
        <Head>
          <title>Loading Case Details...</title>
          <meta name="description" content="Loading CASA case details" />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-fintech-bg-primary dark:to-fintech-bg-secondary">
          <Navigation currentPage="/cases" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-fintech-border-subtle border-t-blue-600 dark:border-t-fintech-accent-blue mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-fintech-text-secondary text-lg">Loading case details...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Only show "not found" after loading is complete and case is still null
  if (!caseDetails) {
    console.log('Case details is null, showing not found message');
    return (
      <>
        <Head>
          <title>Case Not Found</title>
          <meta name="description" content="Case not found" />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-fintech-bg-primary dark:to-fintech-bg-secondary">
          <Navigation currentPage="/cases" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-fintech-loss/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-red-500 dark:text-fintech-loss" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-fintech-text-primary mb-3">Case Not Found</h2>
                <p className="text-gray-600 dark:text-fintech-text-secondary mb-6">The requested case could not be found or you may not have access to it.</p>
                <Link href="/cases" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-fintech-accent-blue dark:hover:bg-blue-600 text-white rounded-lg font-medium shadow-lg transition-all">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Return to Cases
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Case {caseDetails.case_number} - {caseDetails.child_first_name} {caseDetails.child_last_name}</title>
        <meta name="description" content={`CASA case details for ${caseDetails.child_first_name} ${caseDetails.child_last_name}`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-fintech-bg-primary dark:to-fintech-bg-secondary">
        <Navigation currentPage="/cases" />

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-fintech-bg-secondary dark:to-fintech-bg-tertiary border-b border-transparent dark:border-fintech-border-subtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              {/* Breadcrumb */}
              <Link href="/cases" className="inline-flex items-center text-blue-100 dark:text-fintech-text-secondary hover:text-white dark:hover:text-fintech-text-primary mb-4 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Cases
              </Link>

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white dark:text-fintech-text-primary mb-3">
                    {caseDetails.child_first_name} {caseDetails.child_last_name}
                  </h1>
                  <p className="text-blue-100 dark:text-fintech-text-secondary mb-3">Case #{caseDetails.case_number}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full ${
                      caseDetails.status === 'active'
                        ? 'bg-green-500/20 text-green-100 dark:bg-fintech-gain/20 dark:text-fintech-gain'
                        : caseDetails.status === 'pending-review'
                        ? 'bg-yellow-500/20 text-yellow-100 dark:bg-fintech-warning/20 dark:text-fintech-warning'
                        : 'bg-gray-500/20 text-gray-100 dark:bg-gray-500/20 dark:text-gray-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        caseDetails.status === 'active' ? 'bg-green-400 dark:bg-fintech-gain' :
                        caseDetails.status === 'pending-review' ? 'bg-yellow-400 dark:bg-fintech-warning' : 'bg-gray-400'
                      }`}></span>
                      {caseDetails.status?.charAt(0).toUpperCase() + caseDetails.status?.slice(1)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full ${
                      caseDetails.priority === 'high'
                        ? 'bg-red-500/20 text-red-100 dark:bg-fintech-loss/20 dark:text-fintech-loss'
                        : caseDetails.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-100 dark:bg-fintech-warning/20 dark:text-fintech-warning'
                        : 'bg-green-500/20 text-green-100 dark:bg-fintech-gain/20 dark:text-fintech-gain'
                    }`}>
                      {caseDetails.priority?.charAt(0).toUpperCase() + caseDetails.priority?.slice(1)} Priority
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full bg-white/10 text-white dark:bg-fintech-bg-tertiary dark:text-fintech-text-secondary">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {assignedVolunteerName || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2.5 bg-green-500 hover:bg-green-600 dark:bg-fintech-gain dark:hover:bg-green-600 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditClick}
                        className="inline-flex items-center px-4 py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-fintech-warning dark:hover:bg-amber-600 text-white rounded-lg font-semibold shadow-lg transition-all"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Case
                      </button>
                      <button
                        onClick={generateComprehensiveReport}
                        className="inline-flex items-center px-4 py-2.5 bg-white/90 hover:bg-white dark:bg-fintech-bg-tertiary dark:hover:bg-fintech-bg-secondary text-blue-600 dark:text-fintech-accent-blue rounded-lg font-semibold shadow-lg transition-all"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Generate Report
                      </button>
                      <Link
                        href={`/contacts/log?case=${caseDetails?.case_number || ''}`}
                        className="inline-flex items-center px-4 py-2.5 bg-green-500 hover:bg-green-600 dark:bg-fintech-gain dark:hover:bg-green-600 text-white rounded-lg font-semibold shadow-lg transition-all"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Log Contact
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="bg-white dark:bg-fintech-bg-secondary shadow-sm dark:shadow-fintech border-b border-gray-200 dark:border-fintech-border-subtle sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 overflow-x-auto py-2" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', count: null },
                { id: 'contacts', name: 'Contacts', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', count: contactLogs.length },
                { id: 'homevisits', name: 'Home Visits', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', count: homeVisitReports.length },
                { id: 'documents', name: 'Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', count: documents.length },
                { id: 'hearings', name: 'Hearings', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', count: courtHearings.length },
                { id: 'reports', name: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', count: courtReports.length },
                { id: 'timeline', name: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center whitespace-nowrap px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-fintech-text-secondary dark:hover:text-fintech-text-primary dark:hover:bg-fintech-bg-tertiary'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.name}
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-semibold ${
                      activeTab === tab.id
                        ? 'bg-blue-200 text-blue-800 dark:bg-fintech-accent-blue/30 dark:text-fintech-accent-blue'
                        : 'bg-gray-200 text-gray-700 dark:bg-fintech-bg-tertiary dark:text-fintech-text-secondary'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Child Information */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech p-6 border border-gray-100 dark:border-fintech-border-subtle">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-fintech-accent-blue/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-fintech-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Child Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Case Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.case_number || ''}
                          onChange={(e) => handleInputChange('case_number', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                          placeholder="e.g., CASA-2024-001"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{caseDetails.case_number}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">First Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.child_first_name || ''}
                          onChange={(e) => handleInputChange('child_first_name', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{caseDetails.child_first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Last Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.child_last_name || ''}
                          onChange={(e) => handleInputChange('child_last_name', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{caseDetails.child_last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Date of Birth</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData?.child_dob || ''}
                          onChange={(e) => handleInputChange('child_dob', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{formatDate(caseDetails.child_dob)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Priority</label>
                      {isEditing ? (
                        <select
                          value={editFormData?.priority || ''}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary capitalize">{caseDetails.priority}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Case Information */}
                <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech p-6 border border-gray-100 dark:border-fintech-border-subtle">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-fintech-accent-indigo/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-purple-600 dark:text-fintech-accent-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Case Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Case Type</label>
                      {isEditing ? (
                        <select
                          value={editFormData?.case_type || ''}
                          onChange={(e) => handleInputChange('case_type', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        >
                          <option value="dependency">Dependency</option>
                          <option value="neglect">Neglect</option>
                          <option value="abuse">Abuse</option>
                          <option value="abandonment">Abandonment</option>
                        </select>
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary capitalize">{caseDetails.case_type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Referral Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData?.referral_date || ''}
                          onChange={(e) => handleInputChange('referral_date', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{formatDate(caseDetails.referral_date)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Court Jurisdiction</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.court_jurisdiction || ''}
                          onChange={(e) => handleInputChange('court_jurisdiction', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{caseDetails.court_jurisdiction || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Assigned Judge</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.assigned_judge || ''}
                          onChange={(e) => handleInputChange('assigned_judge', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary">{caseDetails.assigned_judge || 'Not assigned'}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-2">Case Summary</label>
                    {isEditing ? (
                      <textarea
                        value={editFormData?.case_summary || ''}
                        onChange={(e) => handleInputChange('case_summary', e.target.value)}
                        rows={4}
                        className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                      />
                    ) : (
                      <div className="bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                        <p className="text-sm text-gray-700 dark:text-fintech-text-secondary leading-relaxed">{caseDetails.case_summary || 'No summary available'}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Status</label>
                    {isEditing ? (
                      <select
                        value={editFormData?.status || ''}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                      </select>
                    ) : (
                      <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary capitalize">{caseDetails.status}</p>
                    )}
                  </div>
                </div>

                {/* Placement Information */}
                <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech p-6 border border-gray-100 dark:border-fintech-border-subtle">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-green-100 dark:bg-fintech-gain/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600 dark:text-fintech-gain" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Current Placement</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Placement Type</label>
                      {isEditing ? (
                        <select
                          value={editFormData?.placement_type || ''}
                          onChange={(e) => handleInputChange('placement_type', e.target.value)}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                        >
                          <option value="foster-care">Foster Care</option>
                          <option value="kinship-care">Kinship Care</option>
                          <option value="group-home">Group Home</option>
                          <option value="residential">Residential Treatment</option>
                          <option value="independent-living">Independent Living</option>
                        </select>
                      ) : (
                        <p className="text-base font-medium text-gray-900 dark:text-fintech-text-primary capitalize">{caseDetails.placement_type?.replace('-', ' ') || 'Not specified'}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-2">Placement Address & Details</label>
                      {isEditing ? (
                        <textarea
                          value={editFormData?.placement_address || ''}
                          onChange={(e) => handleInputChange('placement_address', e.target.value)}
                          rows={3}
                          className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                          placeholder="Address, contact person, phone number, etc."
                        />
                      ) : (
                        <div className="bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                          <p className="text-sm text-gray-700 dark:text-fintech-text-secondary whitespace-pre-line">{caseDetails.placement_address || 'No placement information available'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Case Statistics Card */}
                <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech p-6 border border-gray-100 dark:border-fintech-border-subtle">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-fintech-accent-indigo/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-indigo-600 dark:text-fintech-accent-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Case Statistics</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-fintech-accent-blue/10 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-fintech-accent-blue/20 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-blue-600 dark:text-fintech-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-fintech-text-secondary">Contact Logs</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600 dark:text-fintech-accent-blue">{contactLogs.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-fintech-gain/10 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 dark:bg-fintech-gain/20 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-green-600 dark:text-fintech-gain" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-fintech-text-secondary">Documents</span>
                      </div>
                      <span className="text-lg font-bold text-green-600 dark:text-fintech-gain">{documents.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-fintech-accent-indigo/10 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-fintech-accent-indigo/20 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-purple-600 dark:text-fintech-accent-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-fintech-text-secondary">Court Hearings</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600 dark:text-fintech-accent-indigo">{courtHearings.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-fintech-warning/10 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-fintech-warning/20 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-amber-600 dark:text-fintech-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-fintech-text-secondary">Reports</span>
                      </div>
                      <span className="text-lg font-bold text-amber-600 dark:text-fintech-warning">{homeVisitReports.length + courtReports.length}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech p-6 border border-gray-100 dark:border-fintech-border-subtle">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Quick Actions</h3>
                  </div>
                  <div className="space-y-3">
                    <Link
                      href={`/contacts/log?case=${caseDetails.case_number}`}
                      className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Log New Contact
                    </Link>
                    <Link
                      href={`/reports/home-visit?case=${caseDetails.case_number}`}
                      className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      New Home Visit
                    </Link>
                    <Link
                      href={`/reports/court?case=${caseDetails.case_number}`}
                      className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      New Court Report
                    </Link>
                    <Link
                      href={`/documents?case=${caseDetails.case_number}`}
                      className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Document
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-fintech-border-subtle bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-fintech-bg-tertiary dark:to-fintech-bg-secondary">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Contact Logs</h3>
                    <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{contactLogs.length} contact{contactLogs.length !== 1 ? 's' : ''} recorded</p>
                  </div>
                  <Link
                    href={`/contacts/log?case=${caseDetails.case_number}`}
                    className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-fintech-accent-blue dark:hover:bg-blue-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Contact Log
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                {contactLogs.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-fintech-text-secondary mb-3">No contact logs found for this case.</p>
                    <Link
                      href={`/contacts/log?case=${caseDetails.case_number}`}
                      className="inline-flex items-center text-blue-600 dark:text-fintech-accent-blue hover:text-blue-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create the first contact log
                    </Link>
                  </div>
                ) : (
                  contactLogs.map((contact) => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                    <div className="space-y-4">
                      {/* Header with contact type, date, and volunteer */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                            contact.contact_type === 'phone' ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue' :
                            contact.contact_type === 'in_person' ? 'bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain' :
                            contact.contact_type === 'email' ? 'bg-purple-100 text-purple-700 dark:bg-fintech-accent-indigo/20 dark:text-fintech-accent-indigo' :
                            contact.contact_type === 'home_visit' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
                          }`}>
                            {contact.contact_type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary">
                            {formatDate(contact.contact_date)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-fintech-text-tertiary">
                            {contact.contact_duration} min
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary">
                            {contact.volunteer_name || 'Unknown Volunteer'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-fintech-text-tertiary">
                            {formatDate(contact.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-1">Contact Person</h4>
                          <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{contact.contact_person || 'Not specified'}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-1">Child</h4>
                          <p className="text-sm text-gray-900 dark:text-fintech-text-primary">
                            {contact.child_first_name} {contact.child_last_name}
                          </p>
                        </div>
                      </div>

                      {/* Contact notes */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Contact Summary</h4>
                        <div className="bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                          <p className="text-sm text-gray-700 dark:text-fintech-text-secondary leading-relaxed">
                            {contact.contact_notes || 'No notes provided'}
                          </p>
                        </div>
                      </div>

                      {/* Follow-up section */}
                      {contact.follow_up_required === '1' && (
                        <div className="border-l-4 border-amber-400 dark:border-fintech-warning bg-amber-50 dark:bg-fintech-warning/10 p-4 rounded-r-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-amber-600 dark:text-fintech-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-amber-700 dark:text-fintech-warning font-semibold text-sm">Follow-up Required</span>
                          </div>
                          {contact.follow_up_notes && (
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                              {contact.follow_up_notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-fintech-border-subtle">
                        <button
                          onClick={() => handleViewContact(contact)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-fintech-accent-blue hover:bg-blue-50 dark:hover:bg-fintech-accent-blue/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-fintech-text-secondary hover:bg-gray-100 dark:hover:bg-fintech-bg-tertiary rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'homevisits' && (
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-fintech-border-subtle bg-gradient-to-r from-green-50 to-emerald-50 dark:from-fintech-bg-tertiary dark:to-fintech-bg-secondary">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Home Visits</h3>
                    <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{homeVisitReports.length} visit{homeVisitReports.length !== 1 ? 's' : ''} recorded</p>
                  </div>
                  <Link
                    href={`/reports/home-visit?case=${caseDetails.case_number}`}
                    className="inline-flex items-center px-4 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-fintech-gain dark:hover:bg-green-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Home Visit Report
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                {homeVisitReports.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-fintech-text-secondary mb-3">No home visit reports found for this case.</p>
                    <Link
                      href={`/reports/home-visit?case=${caseDetails.case_number}`}
                      className="inline-flex items-center text-green-600 dark:text-fintech-gain hover:text-green-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create the first home visit report
                    </Link>
                  </div>
                ) : (
                  homeVisitReports.map((visit) => (
                  <div key={visit.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                    <div className="space-y-4">
                      {/* Header with visit date and volunteer */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain rounded-full text-xs font-semibold">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            HOME VISIT
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary">
                            {formatDate(visit.visit_date)}
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-fintech-text-primary">
                            {visit.created_by || 'Unknown Volunteer'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-fintech-text-tertiary">
                            {formatDate(visit.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Visit summary */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Visit Summary</h4>
                        <div className="bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                          <p className="text-sm text-gray-700 dark:text-fintech-text-secondary leading-relaxed">
                            {visit.visit_summary || 'No summary provided'}
                          </p>
                        </div>
                      </div>

                      {/* Assessment details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Physical Appearance</h4>
                          <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${
                            visit.child_physical_appearance === 'excellent' ? 'bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain' :
                            visit.child_physical_appearance === 'good' ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue' :
                            visit.child_physical_appearance === 'fair' ? 'bg-yellow-100 text-yellow-700 dark:bg-fintech-warning/20 dark:text-fintech-warning' :
                            'bg-red-100 text-red-700 dark:bg-fintech-loss/20 dark:text-fintech-loss'
                          }`}>
                            {visit.child_physical_appearance?.charAt(0).toUpperCase() + visit.child_physical_appearance?.slice(1) || 'Not assessed'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Child's Mood</h4>
                          <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${
                            visit.child_mood === 'happy' ? 'bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain' :
                            visit.child_mood === 'content' ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue' :
                            visit.child_mood === 'neutral' ? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300' :
                            visit.child_mood === 'sad' ? 'bg-yellow-100 text-yellow-700 dark:bg-fintech-warning/20 dark:text-fintech-warning' :
                            'bg-red-100 text-red-700 dark:bg-fintech-loss/20 dark:text-fintech-loss'
                          }`}>
                            {visit.child_mood?.charAt(0).toUpperCase() + visit.child_mood?.slice(1) || 'Not assessed'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Home Condition</h4>
                          <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${
                            visit.home_condition === 'excellent' ? 'bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain' :
                            visit.home_condition === 'good' ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue' :
                            visit.home_condition === 'fair' ? 'bg-yellow-100 text-yellow-700 dark:bg-fintech-warning/20 dark:text-fintech-warning' :
                            'bg-red-100 text-red-700 dark:bg-fintech-loss/20 dark:text-fintech-loss'
                          }`}>
                            {visit.home_condition?.charAt(0).toUpperCase() + visit.home_condition?.slice(1) || 'Not assessed'}
                          </span>
                        </div>
                      </div>

                      {/* Concerns and recommendations */}
                      {(visit.concerns_identified || visit.recommendations) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {visit.concerns_identified && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Concerns Identified</h4>
                              <div className="bg-amber-50 dark:bg-fintech-warning/10 border-l-4 border-amber-400 dark:border-fintech-warning p-4 rounded-r-lg">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                  {visit.concerns_identified}
                                </p>
                              </div>
                            </div>
                          )}
                          {visit.recommendations && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 dark:text-fintech-text-tertiary uppercase tracking-wider mb-2">Recommendations</h4>
                              <div className="bg-blue-50 dark:bg-fintech-accent-blue/10 border-l-4 border-blue-400 dark:border-fintech-accent-blue p-4 rounded-r-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                  {visit.recommendations}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-fintech-border-subtle">
                        <button
                          onClick={() => handleViewHomeVisit(visit)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 dark:text-fintech-gain hover:bg-green-50 dark:hover:bg-fintech-gain/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleEditHomeVisit(visit)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-fintech-text-secondary hover:bg-gray-100 dark:hover:bg-fintech-bg-tertiary rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-fintech-border-subtle bg-gradient-to-r from-amber-50 to-orange-50 dark:from-fintech-bg-tertiary dark:to-fintech-bg-secondary">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Documents</h3>
                    <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded</p>
                  </div>
                  <Link
                    href={`/documents?case=${caseDetails.case_number}`}
                    className="inline-flex items-center px-4 py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-fintech-warning dark:hover:bg-amber-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Document
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                {documents.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-fintech-text-secondary mb-3">No documents found for this case.</p>
                    <Link
                      href={`/documents?case=${caseDetails.case_number}`}
                      className="inline-flex items-center text-amber-600 dark:text-fintech-warning hover:text-amber-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload the first document
                    </Link>
                  </div>
                ) : (
                  documents.map((doc) => (
                  <div key={doc.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Document Icon */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            doc.document_type === 'court-order' ? 'bg-red-100 dark:bg-fintech-loss/20' :
                            doc.document_type === 'medical-record' ? 'bg-blue-100 dark:bg-fintech-accent-blue/20' :
                            doc.document_type === 'school-report' ? 'bg-green-100 dark:bg-fintech-gain/20' :
                            doc.document_type === 'case-plan' ? 'bg-purple-100 dark:bg-fintech-accent-indigo/20' :
                            'bg-gray-100 dark:bg-fintech-bg-tertiary'
                          }`}>
                            <svg className={`w-6 h-6 ${
                              doc.document_type === 'court-order' ? 'text-red-600 dark:text-fintech-loss' :
                              doc.document_type === 'medical-record' ? 'text-blue-600 dark:text-fintech-accent-blue' :
                              doc.document_type === 'school-report' ? 'text-green-600 dark:text-fintech-gain' :
                              doc.document_type === 'case-plan' ? 'text-purple-600 dark:text-fintech-accent-indigo' :
                              'text-gray-600 dark:text-fintech-text-secondary'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>

                        {/* Document Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-fintech-text-primary">
                              {doc.document_name}
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              doc.document_type === 'court-order' ? 'bg-red-100 text-red-700 dark:bg-fintech-loss/20 dark:text-fintech-loss' :
                              doc.document_type === 'medical-record' ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue' :
                              doc.document_type === 'school-report' ? 'bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain' :
                              doc.document_type === 'case-plan' ? 'bg-purple-100 text-purple-700 dark:bg-fintech-accent-indigo/20 dark:text-fintech-accent-indigo' :
                              doc.document_type === 'home-visit-report' ? 'bg-amber-100 text-amber-700 dark:bg-fintech-warning/20 dark:text-fintech-warning' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
                            }`}>
                              {doc.document_type.replace(/-/g, ' ').toUpperCase()}
                            </span>
                            {doc.is_confidential && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-fintech-loss/20 dark:text-fintech-loss">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Confidential
                              </span>
                            )}
                          </div>

                          {doc.description && (
                            <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mb-2 line-clamp-2">
                              {doc.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-fintech-text-tertiary">
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {doc.file_name}
                            </span>
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(doc.upload_date)}
                            </span>
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {doc.uploaded_by}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-fintech-accent-blue hover:bg-blue-50 dark:hover:bg-fintech-accent-blue/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 dark:text-fintech-gain hover:bg-green-50 dark:hover:bg-fintech-gain/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 dark:text-fintech-loss hover:bg-red-50 dark:hover:bg-fintech-loss/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'hearings' && (
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-fintech-border-subtle bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-fintech-bg-tertiary dark:to-fintech-bg-secondary">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Court Hearings</h3>
                    <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{courtHearings.length} hearing{courtHearings.length !== 1 ? 's' : ''} scheduled</p>
                  </div>
                  <Link
                    href={`/court-hearings?case=${caseDetails.case_number}`}
                    className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 dark:bg-fintech-accent-indigo dark:hover:bg-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Schedule Hearing
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                {courtHearings.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-fintech-text-secondary mb-3">No court hearings scheduled for this case.</p>
                    <Link
                      href={`/court-hearings?case=${caseDetails.case_number}`}
                      className="inline-flex items-center text-purple-600 dark:text-fintech-accent-indigo hover:text-purple-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Schedule the first hearing
                    </Link>
                  </div>
                ) : (
                  courtHearings.map((hearing) => (
                    <div key={hearing.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-fintech-text-primary">{hearing.hearing_type}</h4>
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                              hearing.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-700 dark:bg-fintech-accent-blue/20 dark:text-fintech-accent-blue'
                                : 'bg-green-100 text-green-700 dark:bg-fintech-gain/20 dark:text-fintech-gain'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${hearing.status === 'scheduled' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                              {hearing.status?.charAt(0).toUpperCase() + hearing.status?.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center text-gray-600 dark:text-fintech-text-secondary">
                              <svg className="w-4 h-4 mr-2 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(hearing.hearing_date)} at {hearing.hearing_time}
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-fintech-text-secondary">
                              <svg className="w-4 h-4 mr-2 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {hearing.court_room || 'TBD'} - {hearing.judge_name || 'Judge TBD'}
                            </div>
                          </div>
                          {hearing.notes && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-fintech-text-secondary bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-3">{hearing.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/reports/court?hearing=${hearing.id}`}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-fintech-accent-indigo hover:bg-purple-50 dark:hover:bg-fintech-accent-indigo/10 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Create Report
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Home Visit Reports */}
              <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-fintech-border-subtle bg-gradient-to-r from-green-50 to-emerald-50 dark:from-fintech-bg-tertiary dark:to-fintech-bg-secondary">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Home Visit Reports</h3>
                      <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{homeVisitReports.length} report{homeVisitReports.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Link
                      href={`/reports/home-visit?case=${caseDetails.case_number}`}
                      className="inline-flex items-center px-4 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-fintech-gain dark:hover:bg-green-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Home Visit Report
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                  {homeVisitReports.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-fintech-text-secondary">No home visit reports yet.</div>
                  ) : (
                    homeVisitReports.map((report) => (
                      <div key={report.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-fintech-text-secondary mb-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Visit Date: {formatDate(report.visit_date)}
                            </div>
                            <p className="text-sm text-gray-900 dark:text-fintech-text-primary mb-3">{report.visit_summary}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-fintech-text-secondary">
                              <span><span className="font-medium">Physical:</span> {report.child_physical_appearance}</span>
                              <span><span className="font-medium">Mood:</span> {report.child_mood}</span>
                              <span><span className="font-medium">Home:</span> {report.home_condition}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-fintech-text-tertiary">
                            By: {report.created_by}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Court Reports */}
              <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech border border-gray-100 dark:border-fintech-border-subtle overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-fintech-border-subtle bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-fintech-bg-tertiary dark:to-fintech-bg-secondary">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Court Reports</h3>
                      <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{courtReports.length} report{courtReports.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Link
                      href={`/reports/court?case=${caseDetails.case_number}`}
                      className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 dark:bg-fintech-accent-indigo dark:hover:bg-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Court Report
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-fintech-border-subtle">
                  {courtReports.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-fintech-text-secondary">No court reports yet.</div>
                  ) : (
                    courtReports.map((report) => (
                      <div key={report.id} className="p-6 hover:bg-gray-50 dark:hover:bg-fintech-bg-tertiary transition-colors">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-fintech-text-primary">{report.hearing_type}</h4>
                              <span className="text-sm text-gray-500 dark:text-fintech-text-tertiary">
                                {formatDate(report.hearing_date)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-fintech-text-secondary mb-3">{report.hearing_summary}</p>
                            {report.casa_recommendations && (
                              <div className="bg-purple-50 dark:bg-fintech-accent-indigo/10 border-l-4 border-purple-400 dark:border-fintech-accent-indigo p-3 rounded-r-lg">
                                <p className="text-sm text-purple-800 dark:text-purple-300">
                                  <span className="font-semibold">CASA Recommendations:</span> {report.casa_recommendations}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-fintech-text-tertiary">
                            By: {report.created_by}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white dark:bg-fintech-bg-secondary rounded-xl shadow-lg dark:shadow-fintech p-6 border border-gray-100 dark:border-fintech-border-subtle">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-fintech-accent-indigo/20 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-fintech-accent-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-fintech-text-primary">Case Timeline</h3>
              </div>
              <div className="flow-root">
                <ul className="-mb-8">
                  {/* Generate comprehensive timeline by combining all activities */}
                  {(() => {
                    const timelineItems: Array<{
                      id: string;
                      type: 'case_created' | 'contact_log' | 'home_visit' | 'document' | 'court_hearing' | 'court_report';
                      date: string;
                      title: string;
                      description: string;
                      user: string;
                      icon: string;
                      color: string;
                    }> = [];

                    // Add case creation
                    if (caseDetails.created_at) {
                      timelineItems.push({
                        id: 'case-created',
                        type: 'case_created',
                        date: caseDetails.created_at,
                        title: 'Case Created',
                        description: `Case ${caseDetails.case_number} created for ${caseDetails.child_first_name} ${caseDetails.child_last_name}`,
                        user: caseDetails.created_by || 'System',
                        icon: '📋',
                        color: 'bg-blue-500'
                      });
                    }

                    // Add contact logs
                    contactLogs.forEach(contact => {
                      const contactTypeIcons: Record<string, string> = {
                        'phone': '📞',
                        'email': '✉️',
                        'in_person': '👥',
                        'home_visit': '🏠',
                        'court_hearing': '⚖️',
                        'other': '📝'
                      };

                      timelineItems.push({
                        id: `contact-${contact.id}`,
                        type: 'contact_log',
                        date: contact.contact_date,
                        title: `${contact.contact_type.replace('_', ' ').toUpperCase()} Contact`,
                        description: contact.contact_notes || `${contact.contact_type} contact with ${contact.contact_person || 'unknown person'}`,
                        user: contact.volunteer_name || contact.created_by || 'Unknown',
                        icon: contactTypeIcons[contact.contact_type] || '📝',
                        color: 'bg-green-500'
                      });
                    });

                    // Add home visit reports
                    homeVisitReports.forEach(visit => {
                      timelineItems.push({
                        id: `visit-${visit.id}`,
                        type: 'home_visit',
                        date: visit.visit_date,
                        title: 'Home Visit Completed',
                        description: visit.visit_summary || `Home visit conducted. Child appeared ${visit.child_physical_appearance || 'well'}, mood was ${visit.child_mood || 'good'}`,
                        user: visit.created_by || 'Unknown',
                        icon: '🏠',
                        color: 'bg-purple-500'
                      });
                    });

                    // Add documents
                    documents.forEach(doc => {
                      const docTypeIcons: Record<string, string> = {
                        'court-order': '⚖️',
                        'medical-record': '🏥',
                        'school-report': '📚',
                        'case-plan': '📋',
                        'home-visit-report': '🏠',
                        'court-report': '📄',
                        'background-check': '🔍',
                        'birth-certificate': '📜',
                        'social-services-report': '🤝'
                      };

                      timelineItems.push({
                        id: `doc-${doc.id}`,
                        type: 'document',
                        date: doc.upload_date,
                        title: 'Document Uploaded',
                        description: `${doc.document_name} (${doc.document_type.replace('-', ' ')})${doc.is_confidential ? ' - Confidential' : ''}`,
                        user: doc.uploaded_by || 'Unknown',
                        icon: docTypeIcons[doc.document_type] || '📄',
                        color: 'bg-yellow-500'
                      });
                    });

                    // Add court hearings
                    courtHearings.forEach(hearing => {
                      timelineItems.push({
                        id: `hearing-${hearing.id}`,
                        type: 'court_hearing',
                        date: hearing.hearing_date,
                        title: `${hearing.hearing_type} Scheduled`,
                        description: `${hearing.hearing_type} in ${hearing.court_room || 'courthouse'} with ${hearing.judge_name || 'judge'}`,
                        user: 'Court System',
                        icon: '⚖️',
                        color: 'bg-red-500'
                      });
                    });

                    // Add court reports
                    courtReports.forEach(report => {
                      timelineItems.push({
                        id: `report-${report.id}`,
                        type: 'court_report',
                        date: report.hearing_date,
                        title: 'Court Report Filed',
                        description: `${report.hearing_type} report: ${report.hearing_summary || 'Court proceedings documented'}`,
                        user: report.created_by || 'Unknown',
                        icon: '📑',
                        color: 'bg-indigo-500'
                      });
                    });

                    // Sort by date (newest first)
                    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return timelineItems.map((item, index) => (
                      <li key={item.id}>
                        <div className="relative pb-8">
                          {index < timelineItems.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-fintech-border-subtle"></span>
                          )}
                          <div className="relative flex space-x-4">
                            <div>
                              <span className={`h-10 w-10 rounded-xl ${item.color} flex items-center justify-center ring-4 ring-white dark:ring-fintech-bg-secondary shadow-md`}>
                                <span className="text-white text-base">{item.icon}</span>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-fintech-text-primary">{item.title}</p>
                                  <p className="text-sm text-gray-600 dark:text-fintech-text-secondary mt-1">{item.description}</p>
                                  <p className="text-xs text-gray-500 dark:text-fintech-text-tertiary mt-2">
                                    by <span className="font-medium text-gray-700 dark:text-fintech-text-secondary">{item.user}</span>
                                  </p>
                                </div>
                                <div className="text-sm whitespace-nowrap text-gray-500 dark:text-fintech-text-tertiary">
                                  <time dateTime={item.date}>
                                    {formatDate(item.date)}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ));
                  })()}
                  
                  {/* Empty state if no activities */}
                  {contactLogs.length === 0 && homeVisitReports.length === 0 && documents.length === 0 && courtHearings.length === 0 && courtReports.length === 0 && (
                    <li>
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-fintech-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400 dark:text-fintech-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-600 dark:text-fintech-text-secondary text-sm">No activities recorded yet.</p>
                        <p className="text-gray-400 dark:text-fintech-text-tertiary text-xs mt-1">Activities will appear here as they are added to the case.</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Log Modal */}
      {(isViewingContact || isEditingContact) && selectedContactLog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-10 mx-auto p-6 border border-gray-200 dark:border-fintech-border-subtle w-11/12 max-w-4xl shadow-2xl dark:shadow-fintech rounded-xl bg-white dark:bg-fintech-bg-secondary">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-fintech-border-subtle">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                {isEditingContact ? 'Edit Contact Log' : 'Contact Log Details'}
              </h3>
              <button
                onClick={handleCloseContactModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-fintech-text-tertiary dark:hover:text-fintech-text-primary hover:bg-gray-100 dark:hover:bg-fintech-bg-tertiary rounded-lg transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Contact Type and Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Contact Type</label>
                  {isEditingContact ? (
                    <select
                      value={contactEditData?.contact_type || ''}
                      onChange={(e) => handleContactInputChange('contact_type', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    >
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="in_person">In Person</option>
                      <option value="home_visit">Home Visit</option>
                      <option value="court_hearing">Court Hearing</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 capitalize">{selectedContactLog.contact_type.replace('_', ' ')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Contact Date</label>
                  {isEditingContact ? (
                    <input
                      type="datetime-local"
                      value={contactEditData?.contact_date || ''}
                      onChange={(e) => handleContactInputChange('contact_date', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{formatDate(selectedContactLog.contact_date)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Duration (minutes)</label>
                  {isEditingContact ? (
                    <input
                      type="number"
                      value={contactEditData?.contact_duration || ''}
                      onChange={(e) => handleContactInputChange('contact_duration', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedContactLog.contact_duration} minutes</p>
                  )}
                </div>
              </div>

              {/* Contact Person and Child */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Contact Person</label>
                  {isEditingContact ? (
                    <input
                      type="text"
                      value={contactEditData?.contact_person || ''}
                      onChange={(e) => handleContactInputChange('contact_person', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedContactLog.contact_person || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Child</label>
                  <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedContactLog.child_first_name} {selectedContactLog.child_last_name}</p>
                </div>
              </div>

              {/* Contact Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-2">Contact Notes</label>
                {isEditingContact ? (
                  <textarea
                    value={contactEditData?.contact_notes || ''}
                    onChange={(e) => handleContactInputChange('contact_notes', e.target.value)}
                    rows={6}
                    className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-fintech-text-secondary leading-relaxed whitespace-pre-wrap">
                      {selectedContactLog.contact_notes || 'No notes provided'}
                    </p>
                  </div>
                )}
              </div>

              {/* Follow-up */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Follow-up Required</label>
                  {isEditingContact ? (
                    <select
                      value={contactEditData?.follow_up_required || '0'}
                      onChange={(e) => handleContactInputChange('follow_up_required', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedContactLog.follow_up_required === '1' ? 'Yes' : 'No'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Follow-up Notes</label>
                  {isEditingContact ? (
                    <textarea
                      value={contactEditData?.follow_up_notes || ''}
                      onChange={(e) => handleContactInputChange('follow_up_notes', e.target.value)}
                      rows={3}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedContactLog.follow_up_notes || 'None'}</p>
                  )}
                </div>
              </div>

              {/* Volunteer and Created Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-fintech-border-subtle">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Created By</label>
                  <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedContactLog.volunteer_name || 'Unknown Volunteer'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Created Date</label>
                  <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{formatDate(selectedContactLog.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-fintech-border-subtle">
              {isEditingContact ? (
                <>
                  <button
                    onClick={handleCloseContactModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-fintech-text-secondary bg-white dark:bg-fintech-bg-tertiary border border-gray-300 dark:border-fintech-border-subtle rounded-lg hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContactEdit}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-fintech-accent-blue border border-transparent rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md transition-all"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseContactModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-fintech-text-secondary bg-white dark:bg-fintech-bg-tertiary border border-gray-300 dark:border-fintech-border-subtle rounded-lg hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEditContact(selectedContactLog)}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-fintech-accent-blue border border-transparent rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md transition-all"
                  >
                    Edit Contact Log
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Home Visit Modal */}
      {(isViewingHomeVisit || isEditingHomeVisit) && selectedHomeVisit && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-10 mx-auto p-6 border border-gray-200 dark:border-fintech-border-subtle w-11/12 max-w-4xl shadow-2xl dark:shadow-fintech rounded-xl bg-white dark:bg-fintech-bg-secondary">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-fintech-border-subtle">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-fintech-text-primary">
                {isEditingHomeVisit ? 'Edit Home Visit Report' : 'Home Visit Report Details'}
              </h3>
              <button
                onClick={handleCloseHomeVisitModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-fintech-text-tertiary dark:hover:text-fintech-text-primary hover:bg-gray-100 dark:hover:bg-fintech-bg-tertiary rounded-lg transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Visit Date */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Visit Date</label>
                {isEditingHomeVisit ? (
                  <input
                    type="date"
                    value={homeVisitEditData?.visit_date || ''}
                    onChange={(e) => handleHomeVisitInputChange('visit_date', e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{formatDate(selectedHomeVisit.visit_date)}</p>
                )}
              </div>

              {/* Visit Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-2">Visit Summary</label>
                {isEditingHomeVisit ? (
                  <textarea
                    value={homeVisitEditData?.visit_summary || ''}
                    onChange={(e) => handleHomeVisitInputChange('visit_summary', e.target.value)}
                    rows={6}
                    className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    placeholder="Describe the overall visit..."
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-fintech-bg-tertiary rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-fintech-text-secondary leading-relaxed whitespace-pre-wrap">
                      {selectedHomeVisit.visit_summary || 'No summary provided'}
                    </p>
                  </div>
                )}
              </div>

              {/* Assessment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Child's Physical Appearance</label>
                  {isEditingHomeVisit ? (
                    <select
                      value={homeVisitEditData?.child_physical_appearance || ''}
                      onChange={(e) => handleHomeVisitInputChange('child_physical_appearance', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    >
                      <option value="">Select assessment</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedHomeVisit.child_physical_appearance === 'excellent' ? 'bg-green-100 text-green-800' :
                      selectedHomeVisit.child_physical_appearance === 'good' ? 'bg-blue-100 text-blue-800' :
                      selectedHomeVisit.child_physical_appearance === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedHomeVisit.child_physical_appearance || 'Not assessed'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Child's Mood</label>
                  {isEditingHomeVisit ? (
                    <select
                      value={homeVisitEditData?.child_mood || ''}
                      onChange={(e) => handleHomeVisitInputChange('child_mood', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    >
                      <option value="">Select mood</option>
                      <option value="happy">Happy</option>
                      <option value="content">Content</option>
                      <option value="neutral">Neutral</option>
                      <option value="sad">Sad</option>
                      <option value="anxious">Anxious</option>
                      <option value="angry">Angry</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedHomeVisit.child_mood === 'happy' ? 'bg-green-100 text-green-800' :
                      selectedHomeVisit.child_mood === 'content' ? 'bg-blue-100 text-blue-800' :
                      selectedHomeVisit.child_mood === 'neutral' ? 'bg-gray-100 text-gray-800' :
                      selectedHomeVisit.child_mood === 'sad' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedHomeVisit.child_mood || 'Not assessed'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Home Condition</label>
                  {isEditingHomeVisit ? (
                    <select
                      value={homeVisitEditData?.home_condition || ''}
                      onChange={(e) => handleHomeVisitInputChange('home_condition', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                    >
                      <option value="">Select condition</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedHomeVisit.home_condition === 'excellent' ? 'bg-green-100 text-green-800' :
                      selectedHomeVisit.home_condition === 'good' ? 'bg-blue-100 text-blue-800' :
                      selectedHomeVisit.home_condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedHomeVisit.home_condition || 'Not assessed'}
                    </span>
                  )}
                </div>
              </div>

              {/* Concerns and Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Concerns Identified</label>
                  {isEditingHomeVisit ? (
                    <textarea
                      value={homeVisitEditData?.concerns_identified || ''}
                      onChange={(e) => handleHomeVisitInputChange('concerns_identified', e.target.value)}
                      rows={4}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                      placeholder="Any concerns noted during the visit..."
                    />
                  ) : (
                    <div className="bg-amber-50 dark:bg-fintech-warning/10 border-l-4 border-amber-400 dark:border-fintech-warning p-4 rounded-r-lg min-h-[100px]">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        {selectedHomeVisit.concerns_identified || 'No concerns identified'}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Recommendations</label>
                  {isEditingHomeVisit ? (
                    <textarea
                      value={homeVisitEditData?.recommendations || ''}
                      onChange={(e) => handleHomeVisitInputChange('recommendations', e.target.value)}
                      rows={4}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                      placeholder="Recommendations for next steps..."
                    />
                  ) : (
                    <div className="bg-blue-50 dark:bg-fintech-accent-blue/10 border-l-4 border-blue-400 dark:border-fintech-accent-blue p-4 rounded-r-lg min-h-[100px]">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {selectedHomeVisit.recommendations || 'No recommendations provided'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visit Duration (if available) */}
              {selectedHomeVisit.visit_duration && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Visit Duration</label>
                  {isEditingHomeVisit ? (
                    <input
                      type="text"
                      value={homeVisitEditData?.visit_duration || ''}
                      onChange={(e) => handleHomeVisitInputChange('visit_duration', e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-fintech-border-subtle rounded-lg shadow-sm bg-white dark:bg-fintech-bg-tertiary text-gray-900 dark:text-fintech-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-fintech-accent-blue focus:border-transparent transition-all"
                      placeholder="e.g., 2 hours"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedHomeVisit.visit_duration}</p>
                  )}
                </div>
              )}

              {/* Created By and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-fintech-border-subtle">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Created By</label>
                  <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{selectedHomeVisit.created_by || 'Unknown Volunteer'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-fintech-text-secondary mb-1">Created Date</label>
                  <p className="text-sm text-gray-900 dark:text-fintech-text-primary">{formatDate(selectedHomeVisit.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-fintech-border-subtle">
              {isEditingHomeVisit ? (
                <>
                  <button
                    onClick={handleCloseHomeVisitModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-fintech-text-secondary bg-white dark:bg-fintech-bg-tertiary border border-gray-300 dark:border-fintech-border-subtle rounded-lg hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHomeVisitEdit}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-fintech-accent-blue border border-transparent rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md transition-all"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseHomeVisitModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-fintech-text-secondary bg-white dark:bg-fintech-bg-tertiary border border-gray-300 dark:border-fintech-border-subtle rounded-lg hover:bg-gray-50 dark:hover:bg-fintech-bg-secondary transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEditHomeVisit(selectedHomeVisit)}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-fintech-accent-blue border border-transparent rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md transition-all"
                  >
                    Edit Home Visit Report
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}