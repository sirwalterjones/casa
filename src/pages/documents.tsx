import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useRequireAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/common/Toast';
import { apiClient } from '@/services/apiClient';
import { FormService } from '@/services/formService';
import Navigation from '@/components/Navigation';

interface CaseDocument {
  id: string;
  case_number: string;
  child_name: string;
  document_type: string;
  document_name: string;
  file_name: string;
  file_size: number;
  upload_date: string;
  uploaded_by: string;
  description: string;
  is_confidential: boolean;
  organization_id: string;
}

interface DocumentUploadFormData {
  case_number: string;
  document_type: string;
  document_name: string;
  description: string;
  is_confidential: boolean;
  file: FileList;
}

// Documents will be loaded from API

const documentTypes = [
  { value: 'court-order', label: 'Court Order' },
  { value: 'medical-record', label: 'Medical Record' },
  { value: 'school-report', label: 'School Report' },
  { value: 'case-plan', label: 'Case Plan' },
  { value: 'home-visit-report', label: 'Home Visit Report' },
  { value: 'court-report', label: 'Court Report' },
  { value: 'background-check', label: 'Background Check' },
  { value: 'birth-certificate', label: 'Birth Certificate' },
  { value: 'social-services-report', label: 'Social Services Report' },
  { value: 'other', label: 'Other' },
];

// Cases will be loaded from API

export default function Documents() {
  const { user, loading } = useRequireAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<CaseDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [caseFilter, setCaseFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [cases, setCases] = useState<{id: string, number: string, childName: string}[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch documents from API
  const fetchDocuments = async () => {
    try {
      const documentsResponse = await apiClient.casaGet('documents');
      
      if (documentsResponse.success && documentsResponse.data) {
        // Handle nested API response structure for documents
        const documentsApiData = documentsResponse.data as any;
        if (documentsApiData.success && documentsApiData.data) {
          setDocuments(documentsApiData.data || []);
        } else {
          setDocuments([]);
        }
      }
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      setApiError(error?.message || 'Failed to load documents');
      setDocuments([]);
    }
  };

  // Load documents and cases from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingDocuments(true);
        setApiError(null);
        const [documentsResponse, casesResponse] = await Promise.all([
          apiClient.casaGet('documents'),
          apiClient.casaGet('cases')
        ]);
        
        if (documentsResponse.success && documentsResponse.data) {
          // Handle nested API response structure for documents
          const documentsApiData = documentsResponse.data as any;
          if (documentsApiData.success && documentsApiData.data) {
            setDocuments(documentsApiData.data || []);
          } else {
            setDocuments([]);
          }
        }
        
        if (casesResponse.success && casesResponse.data) {
          // Handle nested API response structure for cases
          const casesApiData = casesResponse.data as any;
          if (casesApiData.success && casesApiData.data && casesApiData.data.cases) {
            const casesData = casesApiData.data.cases || [];
            setCases(casesData.map((c: any) => ({
              id: c.id,
              number: c.case_number,
              childName: `${c.child_first_name} ${c.child_last_name}`
            })));
          } else {
            setCases([]);
          }
        }
      } catch (error: any) {
        console.error('Failed to load data:', error);
        setApiError(error?.message || 'Failed to load documents and cases');
        // Set empty arrays to prevent render errors
        setDocuments([]);
        setCases([]);
      } finally {
        setIsLoadingDocuments(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<DocumentUploadFormData>();

  useEffect(() => {
    let filtered = documents;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.child_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === typeFilter);
    }

    // Apply case filter
    if (caseFilter !== 'all') {
      filtered = filtered.filter(doc => doc.case_number === caseFilter);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, typeFilter, caseFilter]);

  if (loading || isLoadingDocuments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const onSubmit = async (data: DocumentUploadFormData) => {
    try {
      setIsSubmitting(true);
      
      // Submit to Formidable Forms - Document Upload
      const formidableData = {
        case_id: data.case_number,
        document_type: data.document_type,
        document_title: data.document_name,
        document_file: data.file && data.file[0] ? data.file[0].name : '',
        document_description: data.description,
        upload_date: new Date().toISOString().split('T')[0]
      };

      const formResponse = await FormService.submitFormWithFallback('DOCUMENT_UPLOAD', formidableData);
      
      if (!formResponse.success) {
        throw new Error(formResponse.error || 'Failed to submit document upload form');
      }

      // Also create document in WordPress for compatibility
      const formData = new FormData();
      formData.append('case_number', data.case_number);
      formData.append('document_type', data.document_type);
      formData.append('document_name', data.document_name);
      formData.append('description', data.description);
      formData.append('is_confidential', data.is_confidential.toString());
      formData.append('uploaded_by', `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
      if (user?.organizationId) {
        formData.append('organization_id', user.organizationId);
      }
      
      if (data.file && data.file[0]) {
        formData.append('file', data.file[0]);
      }

      // Submit to WordPress API using apiClient for proper authentication
      const result = await apiClient.casaPost('documents', formData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload document');
      }

      // Use the actual document data returned from the API
      console.log('Upload result:', result);
      console.log('Upload result.data:', result.data);
      
      // Handle nested API response structure
      const apiData = result.data.data || result.data;
      console.log('Extracted API data:', apiData);
      
      if (!apiData || !apiData.id) {
        console.error('API response missing ID:', apiData);
        throw new Error('Upload successful but response missing document ID');
      }
      
      const newDocument: CaseDocument = {
        id: apiData.id.toString(), // Use the real database ID from API
        caseId: data.case_number,
        fileName: apiData.file_name || data.file[0]?.name || 'Unknown',
        fileType: data.document_type,
        fileSize: apiData.file_size || data.file[0]?.size || 0,
        uploadedBy: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        uploadDate: new Date().toISOString(),
        documentType: data.document_type as any,
        isConfidential: data.is_confidential,
        description: data.description,
        fileUrl: apiData.file_url || '',
        organizationId: user?.organizationId || '',
      };
      
      // Refresh the document list from API to get the latest data
      await fetchDocuments();

      reset();
      setShowUploadModal(false);
      showToast({ type: 'success', title: 'Upload successful', description: 'Your document has been uploaded.' });
      
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      showToast({ type: 'error', title: 'Upload failed', description: error?.message || 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'court-order': return 'bg-red-100 text-red-800';
      case 'medical-record': return 'bg-blue-100 text-blue-800';
      case 'school-report': return 'bg-green-100 text-green-800';
      case 'case-plan': return 'bg-purple-100 text-purple-800';
      case 'home-visit-report': return 'bg-yellow-100 text-yellow-800';
      case 'court-report': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'court-order': return '⚖️';
      case 'medical-record': return '🏥';
      case 'school-report': return '📚';
      case 'case-plan': return '📋';
      case 'home-visit-report': return '🏠';
      case 'court-report': return '📄';
      case 'background-check': return '🔍';
      case 'birth-certificate': return '📜';
      case 'social-services-report': return '🤝';
      default: return '📄';
    }
  };

  // Document action handlers
  const handleViewDocument = async (document: CaseDocument) => {
    console.log('handleViewDocument called with document:', document);
    try {
      console.log('Making API call to download document:', document.id);
      const response = await apiClient.casaGet(`documents/${document.id}/download`);
      console.log('API response:', response);
      
      if (response.success && response.data) {
        const downloadData = response.data as any;
        console.log('Download data:', downloadData);
        
        // Handle nested response structure
        const actualData = downloadData.data || downloadData;
        console.log('Actual download data:', actualData);
        
        if (actualData && actualData.download_url) {
          console.log('Opening URL:', actualData.download_url);
          window.open(actualData.download_url, '_blank');
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
        
        // Handle nested response structure  
        const actualData = downloadData.data || downloadData;
        console.log('Download response data:', actualData);
        
        if (actualData && actualData.download_url) {
          const link = document.createElement('a');
          link.href = actualData.download_url;
          link.download = actualData.file_name;
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
          setDocuments(documents.filter(doc => doc.id !== document.id));
          setFilteredDocuments(filteredDocuments.filter(doc => doc.id !== document.id));
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

  return (
    <>
      <Head>
        <title>Documents - CASA Case Management</title>
        <meta name="description" content="Manage case documents and files" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header Navigation */}
        <Navigation currentPage="/documents" />
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <h1 className="text-3xl font-light mb-2">Document Management</h1>
              <p className="text-green-100 text-lg">Manage case documents and files securely</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Upload Button */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Documents</label>
                <input
                  type="text"
                  placeholder="Search by document name, case, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Types</option>
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Filter</label>
                <select
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Cases</option>
                  {cases.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.number}>
                      {caseItem.number} - {caseItem.childName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="sm:w-48 flex items-end">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Upload Document
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">📄</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Documents</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {documents.length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold">🔒</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Confidential</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {documents.filter(d => d.is_confidential).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">⚖️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Court Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {documents.filter(d => d.document_type === 'court-order').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">This Month</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {documents.filter(d => {
                      const uploadDate = new Date(d.upload_date);
                      const thisMonth = new Date();
                      return uploadDate.getMonth() === thisMonth.getMonth() && 
                             uploadDate.getFullYear() === thisMonth.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Documents ({filteredDocuments.length})
              </h2>
            </div>
            
            {filteredDocuments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No documents found matching your criteria.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <div key={document.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">
                              {getDocumentIcon(document.document_type)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {document.document_name}
                            </h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDocumentTypeColor(document.document_type)}`}>
                              {documentTypes.find(t => t.value === document.document_type)?.label || document.document_type}
                            </span>
                            {document.is_confidential && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                🔒 Confidential
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <span>Case: {document.case_number}</span>
                            <span>Child: {document.child_name}</span>
                            <span>Size: {formatFileSize(document.file_size)}</span>
                            <span>Uploaded: {new Date(document.upload_date).toLocaleDateString()}</span>
                            <span>By: {document.uploaded_by}</span>
                          </div>
                          
                          {document.description && (
                            <p className="mt-1 text-sm text-gray-600 truncate">
                              {document.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Case Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('case_number', { required: 'Case number is required' })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        errors.case_number ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Case</option>
                      {cases.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.number}>
                          {caseItem.number} - {caseItem.childName}
                        </option>
                      ))}
                    </select>
                    {errors.case_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.case_number.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Document Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('document_type', { required: 'Document type is required' })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        errors.document_type ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Type</option>
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {errors.document_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.document_type.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('document_name', { required: 'Document name is required' })}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.document_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter a descriptive name for this document"
                  />
                  {errors.document_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.document_name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('file', { required: 'File is required' })}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.file ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max: 10MB)
                  </p>
                  {errors.file && (
                    <p className="mt-1 text-sm text-red-600">{errors.file.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Additional notes about this document"
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      {...register('is_confidential')}
                      type="checkbox"
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Mark as confidential (restricted access)
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}