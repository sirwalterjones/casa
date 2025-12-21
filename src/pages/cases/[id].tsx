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

// Mock data - in production, this would come from API
const mockCaseDetails: CaseDetails = {
  id: '1',
  case_number: '2024-001',
  child_first_name: 'Emily',
  child_last_name: 'Johnson',
  child_dob: '2014-03-15',
  child_gender: 'female',
  child_ethnicity: 'white',
  case_type: 'abuse',
  case_status: 'active',
  case_priority: 'high',
  referral_date: '2024-01-15',
  case_summary: 'Child removed from home due to physical abuse. Currently in foster care.',
  court_jurisdiction: 'family-court',
  assigned_judge: 'Judge Smith',
  current_placement: 'foster_care',
  placement_address: '123 Foster Lane, Canton GA 30115',
  assigned_volunteer: 'Jane Smith',
  assignment_date: '2024-01-20',
  case_goals: 'Ensure child safety, provide stability, work toward permanency plan',
  created_by: 'Walter Jones',
  created_at: '2024-01-15T10:00:00Z',
  organization_id: 'org-placeholder',
};

const mockContactLogs: ContactLog[] = [
  {
    id: '1',
    case_number: '2024-001',
    contact_type: 'home-visit',
    contact_date: '2024-12-10',
    contact_time: '14:00',
    contact_duration: '90',
    child_present: true,
    location: 'Foster home',
    people_present: 'Emily, Foster mother Sarah, Foster father Mike',
    summary: 'Emily appears well-adjusted to foster home. She is doing well in school and has made friends.',
    action_items: 'Follow up on therapy sessions, check school records',
    created_by: 'Jane Smith',
    created_at: '2024-12-10T14:00:00Z',
  },
  {
    id: '2',
    case_number: '2024-001',
    contact_type: 'phone-call',
    contact_date: '2024-12-05',
    contact_time: '10:30',
    contact_duration: '30',
    child_present: false,
    location: 'N/A',
    people_present: 'Foster mother Sarah',
    summary: 'Discussed Emily\'s progress in therapy and upcoming parent-teacher conference.',
    action_items: 'Attend parent-teacher conference on 12/15',
    created_by: 'Jane Smith',
    created_at: '2024-12-05T10:30:00Z',
  },
];

const mockDocuments: CaseDocument[] = [
  {
    id: '1',
    case_number: '2024-001',
    document_type: 'court-order',
    document_name: 'Initial Removal Order',
    file_name: 'removal_order_2024001.pdf',
    upload_date: '2024-01-15',
    uploaded_by: 'Court Clerk',
    description: 'Court order authorizing removal and CASA appointment',
    is_confidential: true,
  },
  {
    id: '2',
    case_number: '2024-001',
    document_type: 'medical-record',
    document_name: 'Medical Evaluation',
    file_name: 'medical_eval_emily.pdf',
    upload_date: '2024-02-01',
    uploaded_by: 'Dr. Wilson',
    description: 'Comprehensive medical evaluation post-removal',
    is_confidential: true,
  },
];

const mockCourtHearings: CourtHearing[] = [
  {
    id: '1',
    case_number: '2024-001',
    hearing_date: '2024-12-20',
    hearing_time: '09:00',
    hearing_type: 'Review Hearing',
    court_room: 'Courtroom A',
    judge_name: 'Judge Smith',
    status: 'scheduled',
    notes: 'Review placement stability and case progress',
  },
  {
    id: '2',
    case_number: '2024-001',
    hearing_date: '2024-09-15',
    hearing_time: '10:30',
    hearing_type: 'Initial Hearing',
    court_room: 'Courtroom A',
    judge_name: 'Judge Smith',
    status: 'completed',
    notes: 'Initial hearing for case establishment',
  },
];

const mockHomeVisitReports: HomeVisitReport[] = [
  {
    id: '1',
    case_number: '2024-001',
    visit_date: '2024-12-10',
    visit_summary: 'Emily is thriving in her foster placement. Home environment is safe and nurturing.',
    child_physical_appearance: 'excellent',
    child_mood: 'happy',
    home_condition: 'excellent',
    concerns_identified: 'None at this time',
    recommendations: 'Continue current placement, monitor therapy progress',
    created_by: 'Jane Smith',
    created_at: '2024-12-10T16:00:00Z',
  },
];

const mockCourtReports: CourtReport[] = [
  {
    id: '1',
    case_number: '2024-001',
    hearing_date: '2024-09-15',
    hearing_type: 'Initial Hearing',
    hearing_summary: 'Court established CASA involvement and approved current placement.',
    court_orders: 'CASA volunteer appointed, therapy ordered for child',
    casa_recommendations: 'Continue foster placement, regular therapy sessions',
    next_hearing_date: '2024-12-20',
    created_by: 'Jane Smith',
    created_at: '2024-09-15T11:00:00Z',
  },
];

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
        if (hearingsResponse.success && hearingsResponse.data) {
          const hearingsData = hearingsResponse.data as any;
          if (hearingsData.success && hearingsData.data) {
            setCourtHearings(hearingsData.data || []);
          }
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
      }
    };

    loadCaseData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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

  // Show loading state if case details haven't loaded yet
  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Case Details...</title>
          <meta name="description" content="Loading CASA case details" />
        </Head>

        <div className="min-h-screen bg-gray-50">
          <Navigation currentPage="/cases" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading case details...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!caseDetails) {
    console.log('Case details is null, showing not found message');
    return (
      <>
        <Head>
          <title>Case Not Found</title>
          <meta name="description" content="Case not found" />
        </Head>

        <div className="min-h-screen bg-gray-50">
          <Navigation currentPage="/cases" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Case Not Found</h2>
                <p className="text-gray-600 mb-4">The requested case could not be found.</p>
                <Link href="/cases" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
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

      <div className="min-h-screen bg-gray-50">
        <Navigation currentPage="/cases" />
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-light mb-2">
                    Case {caseDetails.case_number}: {caseDetails.child_first_name} {caseDetails.child_last_name}
                  </h1>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(caseDetails.status)}`}>
                      {caseDetails.status}
                    </span>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(caseDetails.priority)}`}>
                      {caseDetails.priority} priority
                    </span>
                    <span className="text-blue-100">
                      Assigned to: {assignedVolunteerName || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditClick}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-yellow-700"
                      >
                        Edit Case
                      </button>
                      <button
                        onClick={generateComprehensiveReport}
                        className="bg-white text-blue-600 px-4 py-2 rounded-md font-semibold hover:bg-blue-50"
                      >
                        Generate Report
                      </button>
                      <Link
                        href={`/contacts/log?case=${caseDetails?.case_number || ''}`}
                        className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-700"
                      >
                        Log Contact
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <Link href="/cases" className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                ← All Cases
              </Link>
            </nav>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', count: null },
                { id: 'contacts', name: 'Contact Logs', count: contactLogs.length },
                { id: 'homevisits', name: 'Home Visits', count: homeVisitReports.length },
                { id: 'documents', name: 'Documents', count: documents.length },
                { id: 'hearings', name: 'Court Hearings', count: courtHearings.length },
                { id: 'reports', name: 'Reports', count: courtReports.length },
                { id: 'timeline', name: 'Timeline', count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count !== null && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Child Information */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Child Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Case Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.case_number || ''}
                          onChange={(e) => handleInputChange('case_number', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., CASA-2024-001"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.case_number}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.child_first_name || ''}
                          onChange={(e) => handleInputChange('child_first_name', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.child_first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.child_last_name || ''}
                          onChange={(e) => handleInputChange('child_last_name', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.child_last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData?.child_dob || ''}
                          onChange={(e) => handleInputChange('child_dob', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{formatDate(caseDetails.child_dob)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      {isEditing ? (
                        <select
                          value={editFormData?.priority || ''}
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.priority}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Case Information */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Case Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Case Type</label>
                      {isEditing ? (
                        <select
                          value={editFormData?.case_type || ''}
                          onChange={(e) => handleInputChange('case_type', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="dependency">Dependency</option>
                          <option value="neglect">Neglect</option>
                          <option value="abuse">Abuse</option>
                          <option value="abandonment">Abandonment</option>
                        </select>
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.case_type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Referral Date</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editFormData?.referral_date || ''}
                          onChange={(e) => handleInputChange('referral_date', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{formatDate(caseDetails.referral_date)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Court Jurisdiction</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.court_jurisdiction || ''}
                          onChange={(e) => handleInputChange('court_jurisdiction', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.court_jurisdiction}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Assigned Judge</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.assigned_judge || ''}
                          onChange={(e) => handleInputChange('assigned_judge', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.assigned_judge}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Case Summary</label>
                    {isEditing ? (
                      <textarea
                        value={editFormData?.case_summary || ''}
                        onChange={(e) => handleInputChange('case_summary', e.target.value)}
                        rows={4}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">{caseDetails.case_summary}</p>
                    )}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    {isEditing ? (
                      <select
                        value={editFormData?.status || ''}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900">{caseDetails.status}</p>
                    )}
                  </div>
                </div>

                {/* Placement Information */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Current Placement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Placement Type</label>
                      {isEditing ? (
                        <select
                          value={editFormData?.placement_type || ''}
                          onChange={(e) => handleInputChange('placement_type', e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="foster-care">Foster Care</option>
                          <option value="kinship-care">Kinship Care</option>
                          <option value="group-home">Group Home</option>
                          <option value="residential">Residential Treatment</option>
                          <option value="independent-living">Independent Living</option>
                        </select>
                      ) : (
                        <p className="text-sm text-gray-900">{caseDetails.placement_type}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Placement Address & Details</label>
                      {isEditing ? (
                        <textarea
                          value={editFormData?.placement_address || ''}
                          onChange={(e) => handleInputChange('placement_address', e.target.value)}
                          rows={3}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Address, contact person, phone number, etc."
                        />
                      ) : (
                        <p className="text-sm text-gray-900 whitespace-pre-line">{caseDetails.placement_address}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div>
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Case Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Contact Logs</span>
                      <span className="text-sm font-medium text-gray-900">{contactLogs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Documents</span>
                      <span className="text-sm font-medium text-gray-900">{documents.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Court Hearings</span>
                      <span className="text-sm font-medium text-gray-900">{courtHearings.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reports</span>
                      <span className="text-sm font-medium text-gray-900">{homeVisitReports.length + courtReports.length}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      href={`/contacts/log?case=${caseDetails.case_number}`}
                      className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                      Log New Contact
                    </Link>
                    <Link
                      href={`/reports/home-visit?case=${caseDetails.case_number}`}
                      className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700"
                    >
                      New Home Visit Report
                    </Link>
                    <Link
                      href={`/reports/court?case=${caseDetails.case_number}`}
                      className="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded-md hover:bg-purple-700"
                    >
                      New Court Report
                    </Link>
                    <Link
                      href={`/documents?case=${caseDetails.case_number}`}
                      className="block w-full bg-yellow-600 text-white text-center py-2 px-4 rounded-md hover:bg-yellow-700"
                    >
                      Upload Document
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Contact Logs ({contactLogs.length})</h3>
                  <Link
                    href={`/contacts/log?case=${caseDetails.case_number}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    New Contact Log
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {contactLogs.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No contact logs found for this case.</p>
                    <Link
                      href={`/contacts/log?case=${caseDetails.case_number}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Create the first contact log
                    </Link>
                  </div>
                ) : (
                  contactLogs.map((contact) => (
                  <div key={contact.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="space-y-4">
                      {/* Header with contact type, date, and volunteer */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            contact.contact_type === 'phone' ? 'bg-blue-100 text-blue-800' :
                            contact.contact_type === 'in_person' ? 'bg-green-100 text-green-800' :
                            contact.contact_type === 'email' ? 'bg-purple-100 text-purple-800' :
                            contact.contact_type === 'home_visit' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {contact.contact_type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(contact.contact_date)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Duration: {contact.contact_duration} minutes
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.volunteer_name || 'Unknown Volunteer'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(contact.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Contact Person</h4>
                          <p className="text-sm text-gray-900">{contact.contact_person || 'Not specified'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Child</h4>
                          <p className="text-sm text-gray-900">
                            {contact.child_first_name} {contact.child_last_name}
                          </p>
                        </div>
                      </div>

                      {/* Contact notes */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Summary</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {contact.contact_notes || 'No notes provided'}
                          </p>
                        </div>
                      </div>

                      {/* Follow-up section */}
                      {contact.follow_up_required === '1' && (
                        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-r-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-yellow-600 font-medium text-sm">⚠️ Follow-up Required</span>
                          </div>
                          {contact.follow_up_notes && (
                            <p className="text-sm text-yellow-800">
                              {contact.follow_up_notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => handleViewContact(contact)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleEditContact(contact)}
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
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
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Home Visits ({homeVisitReports.length})</h3>
                  <Link
                    href={`/reports/home-visit?case=${caseDetails.case_number}`}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    New Home Visit Report
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {homeVisitReports.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>No home visit reports found for this case.</p>
                    <Link
                      href={`/reports/home-visit?case=${caseDetails.case_number}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Create the first home visit report
                    </Link>
                  </div>
                ) : (
                  homeVisitReports.map((visit) => (
                  <div key={visit.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="space-y-4">
                      {/* Header with visit date and volunteer */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                            HOME VISIT
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(visit.visit_date)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {visit.created_by || 'Unknown Volunteer'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(visit.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Visit summary */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Visit Summary</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {visit.visit_summary || 'No summary provided'}
                          </p>
                        </div>
                      </div>

                      {/* Assessment details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Child's Physical Appearance</h4>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            visit.child_physical_appearance === 'excellent' ? 'bg-green-100 text-green-800' :
                            visit.child_physical_appearance === 'good' ? 'bg-blue-100 text-blue-800' :
                            visit.child_physical_appearance === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {visit.child_physical_appearance || 'Not assessed'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Child's Mood</h4>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            visit.child_mood === 'happy' ? 'bg-green-100 text-green-800' :
                            visit.child_mood === 'content' ? 'bg-blue-100 text-blue-800' :
                            visit.child_mood === 'neutral' ? 'bg-gray-100 text-gray-800' :
                            visit.child_mood === 'sad' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {visit.child_mood || 'Not assessed'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Home Condition</h4>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            visit.home_condition === 'excellent' ? 'bg-green-100 text-green-800' :
                            visit.home_condition === 'good' ? 'bg-blue-100 text-blue-800' :
                            visit.home_condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {visit.home_condition || 'Not assessed'}
                          </span>
                        </div>
                      </div>

                      {/* Concerns and recommendations */}
                      {(visit.concerns_identified || visit.recommendations) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {visit.concerns_identified && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Concerns Identified</h4>
                              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
                                <p className="text-sm text-yellow-800">
                                  {visit.concerns_identified}
                                </p>
                              </div>
                            </div>
                          )}
                          {visit.recommendations && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                <p className="text-sm text-blue-800">
                                  {visit.recommendations}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => handleViewHomeVisit(visit)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleEditHomeVisit(visit)}
                          className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                        >
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
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                  <Link
                    href={`/documents?case=${caseDetails.case_number}`}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Upload Document
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {documents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                    <p className="mb-2">No documents found for this case.</p>
                    <Link
                      href={`/documents?case=${caseDetails.case_number}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Upload the first document
                    </Link>
                  </div>
                ) : (
                  documents.map((document) => (
                  <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Document Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">
                              {document.document_type === 'court-order' ? '⚖️' :
                               document.document_type === 'medical-record' ? '🏥' :
                               document.document_type === 'school-report' ? '📚' :
                               document.document_type === 'case-plan' ? '📋' :
                               document.document_type === 'home-visit-report' ? '🏠' :
                               document.document_type === 'court-report' ? '📄' :
                               document.document_type === 'background-check' ? '🔍' :
                               document.document_type === 'birth-certificate' ? '📜' :
                               document.document_type === 'social-services-report' ? '🤝' :
                               '📄'
                              }
                            </span>
                          </div>
                        </div>
                        
                        {/* Document Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {document.document_name}
                            </h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              document.document_type === 'court-order' ? 'bg-red-100 text-red-800' :
                              document.document_type === 'medical-record' ? 'bg-blue-100 text-blue-800' :
                              document.document_type === 'school-report' ? 'bg-green-100 text-green-800' :
                              document.document_type === 'case-plan' ? 'bg-purple-100 text-purple-800' :
                              document.document_type === 'home-visit-report' ? 'bg-yellow-100 text-yellow-800' :
                              document.document_type === 'court-report' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {document.document_type.replace(/-/g, ' ').toUpperCase()}
                            </span>
                            {document.is_confidential && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                🔒 Confidential
                              </span>
                            )}
                          </div>
                          
                          {document.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {document.description}
                            </p>
                          )}
                          
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <span>File: {document.file_name}</span>
                            {document.file_size && (
                              <span>Size: {Math.round(document.file_size / 1024)} KB</span>
                            )}
                            <span>Uploaded: {formatDate(document.upload_date)}</span>
                            <span>By: {document.uploaded_by}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button 
                          onClick={() => handleViewDocument(document)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleDownloadDocument(document)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          Download
                        </button>
                        <button 
                          onClick={() => handleDeleteDocument(document)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
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
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Court Hearings</h3>
                  <Link
                    href="/court-hearings"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                  >
                    Schedule Hearing
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {courtHearings.map((hearing) => (
                  <div key={hearing.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{hearing.hearing_type}</h4>
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                            hearing.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {hearing.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Date:</span> {formatDate(hearing.hearing_date)} at {hearing.hearing_time}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Location:</span> {hearing.court_room} - {hearing.judge_name}
                        </div>
                        {hearing.notes && (
                          <p className="text-sm text-gray-600">{hearing.notes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/reports/court?hearing=${hearing.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Create Report
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Home Visit Reports */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Home Visit Reports</h3>
                    <Link
                      href={`/reports/home-visit?case=${caseDetails.case_number}`}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      New Home Visit Report
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {homeVisitReports.map((report) => (
                    <div key={report.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 mb-2">
                            Visit Date: {formatDate(report.visit_date)}
                          </div>
                          <p className="text-sm text-gray-900 mb-2">{report.visit_summary}</p>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Child Condition:</span> {report.child_physical_appearance} physical, {report.child_mood} mood
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Home Condition:</span> {report.home_condition}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          By: {report.created_by}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Court Reports */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Court Reports</h3>
                    <Link
                      href={`/reports/court?case=${caseDetails.case_number}`}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      New Court Report
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {courtReports.map((report) => (
                    <div key={report.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{report.hearing_type}</h4>
                            <span className="text-sm text-gray-500">
                              {formatDate(report.hearing_date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-2">{report.hearing_summary}</p>
                          {report.casa_recommendations && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">CASA Recommendations:</span> {report.casa_recommendations}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          By: {report.created_by}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Case Timeline</h3>
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
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full ${item.color} flex items-center justify-center ring-8 ring-white`}>
                                <span className="text-white text-sm">{item.icon}</span>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  by <span className="font-medium">{item.user}</span>
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={item.date}>
                                  {formatDate(item.date)}
                                </time>
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
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No activities recorded yet.</p>
                        <p className="text-gray-400 text-xs mt-1">Activities will appear here as they are added to the case.</p>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditingContact ? 'Edit Contact Log' : 'Contact Log Details'}
              </h3>
              <button
                onClick={handleCloseContactModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Contact Type and Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type</label>
                  {isEditingContact ? (
                    <select
                      value={contactEditData?.contact_type || ''}
                      onChange={(e) => handleContactInputChange('contact_type', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Date</label>
                  {isEditingContact ? (
                    <input
                      type="datetime-local"
                      value={contactEditData?.contact_date || ''}
                      onChange={(e) => handleContactInputChange('contact_date', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{formatDate(selectedContactLog.contact_date)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  {isEditingContact ? (
                    <input
                      type="number"
                      value={contactEditData?.contact_duration || ''}
                      onChange={(e) => handleContactInputChange('contact_duration', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{selectedContactLog.contact_duration} minutes</p>
                  )}
                </div>
              </div>

              {/* Contact Person and Child */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  {isEditingContact ? (
                    <input
                      type="text"
                      value={contactEditData?.contact_person || ''}
                      onChange={(e) => handleContactInputChange('contact_person', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{selectedContactLog.contact_person || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
                  <p className="text-sm text-gray-900">{selectedContactLog.child_first_name} {selectedContactLog.child_last_name}</p>
                </div>
              </div>

              {/* Contact Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Notes</label>
                {isEditingContact ? (
                  <textarea
                    value={contactEditData?.contact_notes || ''}
                    onChange={(e) => handleContactInputChange('contact_notes', e.target.value)}
                    rows={6}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedContactLog.contact_notes || 'No notes provided'}
                    </p>
                  </div>
                )}
              </div>

              {/* Follow-up */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Required</label>
                  {isEditingContact ? (
                    <select
                      value={contactEditData?.follow_up_required || '0'}
                      onChange={(e) => handleContactInputChange('follow_up_required', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">{selectedContactLog.follow_up_required === '1' ? 'Yes' : 'No'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                  {isEditingContact ? (
                    <textarea
                      value={contactEditData?.follow_up_notes || ''}
                      onChange={(e) => handleContactInputChange('follow_up_notes', e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{selectedContactLog.follow_up_notes || 'None'}</p>
                  )}
                </div>
              </div>

              {/* Volunteer and Created Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <p className="text-sm text-gray-900">{selectedContactLog.volunteer_name || 'Unknown Volunteer'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedContactLog.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              {isEditingContact ? (
                <>
                  <button
                    onClick={handleCloseContactModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContactEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseContactModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEditContact(selectedContactLog)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditingHomeVisit ? 'Edit Home Visit Report' : 'Home Visit Report Details'}
              </h3>
              <button
                onClick={handleCloseHomeVisitModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Visit Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
                {isEditingHomeVisit ? (
                  <input
                    type="date"
                    value={homeVisitEditData?.visit_date || ''}
                    onChange={(e) => handleHomeVisitInputChange('visit_date', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{formatDate(selectedHomeVisit.visit_date)}</p>
                )}
              </div>

              {/* Visit Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visit Summary</label>
                {isEditingHomeVisit ? (
                  <textarea
                    value={homeVisitEditData?.visit_summary || ''}
                    onChange={(e) => handleHomeVisitInputChange('visit_summary', e.target.value)}
                    rows={6}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the overall visit..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedHomeVisit.visit_summary || 'No summary provided'}
                    </p>
                  </div>
                )}
              </div>

              {/* Assessment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Child's Physical Appearance</label>
                  {isEditingHomeVisit ? (
                    <select
                      value={homeVisitEditData?.child_physical_appearance || ''}
                      onChange={(e) => handleHomeVisitInputChange('child_physical_appearance', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Child's Mood</label>
                  {isEditingHomeVisit ? (
                    <select
                      value={homeVisitEditData?.child_mood || ''}
                      onChange={(e) => handleHomeVisitInputChange('child_mood', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Condition</label>
                  {isEditingHomeVisit ? (
                    <select
                      value={homeVisitEditData?.home_condition || ''}
                      onChange={(e) => handleHomeVisitInputChange('home_condition', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Concerns Identified</label>
                  {isEditingHomeVisit ? (
                    <textarea
                      value={homeVisitEditData?.concerns_identified || ''}
                      onChange={(e) => handleHomeVisitInputChange('concerns_identified', e.target.value)}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any concerns noted during the visit..."
                    />
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg min-h-[100px]">
                      <p className="text-sm text-yellow-800">
                        {selectedHomeVisit.concerns_identified || 'No concerns identified'}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                  {isEditingHomeVisit ? (
                    <textarea
                      value={homeVisitEditData?.recommendations || ''}
                      onChange={(e) => handleHomeVisitInputChange('recommendations', e.target.value)}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Recommendations for next steps..."
                    />
                  ) : (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg min-h-[100px]">
                      <p className="text-sm text-blue-800">
                        {selectedHomeVisit.recommendations || 'No recommendations provided'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Visit Duration (if available) */}
              {selectedHomeVisit.visit_duration && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Duration</label>
                  {isEditingHomeVisit ? (
                    <input
                      type="text"
                      value={homeVisitEditData?.visit_duration || ''}
                      onChange={(e) => handleHomeVisitInputChange('visit_duration', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2 hours"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{selectedHomeVisit.visit_duration}</p>
                  )}
                </div>
              )}

              {/* Created By and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <p className="text-sm text-gray-900">{selectedHomeVisit.created_by || 'Unknown Volunteer'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedHomeVisit.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              {isEditingHomeVisit ? (
                <>
                  <button
                    onClick={handleCloseHomeVisitModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHomeVisitEdit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseHomeVisitModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleEditHomeVisit(selectedHomeVisit)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
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