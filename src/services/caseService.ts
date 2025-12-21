import { apiClient } from './apiClient';
import { CasaCase, Child, ContactLog, CaseDocument, ApiResponse, CasesAPIResponse, ContactLogsAPIResponse, DocumentsAPIResponse } from '@/types';

export class CaseService {
  // Get all cases for current organization
  async getCases(filters?: {
    status?: string;
    volunteerId?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<CasesAPIResponse>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.volunteerId) params.append('volunteer_id', filters.volunteerId);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('per_page', filters.limit.toString());

      const response = await apiClient.get(`casa/v1/cases?${params.toString()}`);
      return response as ApiResponse<CasesAPIResponse>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch cases',
      };
    }
  }

  // Get single case by ID
  async getCase(caseId: string): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.get(`casa/v1/cases/${caseId}`);
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch case',
      };
    }
  }

  // Create new case
  async createCase(caseData: {
    // Child Information
    child_first_name: string;
    child_last_name: string;
    child_dob: string;
    child_gender?: string;
    child_ethnicity?: string;
    
    // Case Details
    case_number: string;
    case_type: string;
    case_priority?: string;
    referral_date?: string;
    case_summary?: string;
    
    // Court Information
    court_jurisdiction?: string;
    assigned_judge?: string;
    courtroom?: string;
    
    // Placement Information
    current_placement?: string;
    placement_date?: string;
    placement_address?: string;
    placement_contact_person?: string;
    placement_phone?: string;
    
    // Volunteer Assignment
    assigned_volunteer?: string;
    assignment_date?: string;
    
    // Case Goals
    case_goals?: string;
  }): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.post('casa/v1/cases', caseData);
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create case',
      };
    }
  }

  // Update existing case
  async updateCase(caseId: string, updates: Partial<CasaCase>): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.put(`casa/v1/cases/${caseId}`, updates);
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update case',
      };
    }
  }

  // Delete case
  async deleteCase(caseId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.delete(`casa/v1/cases/${caseId}`);
      return response as ApiResponse<{ message: string }>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete case',
      };
    }
  }

  // Assign volunteer to case
  async assignVolunteer(caseId: string, volunteerId: string): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.post(`casa/v1/cases/${caseId}/assign-volunteer`, {
        volunteer_id: volunteerId,
        assignment_date: new Date().toISOString().split('T')[0],
      });
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to assign volunteer',
      };
    }
  }

  // Update case status
  async updateCaseStatus(
    caseId: string, 
    status: string,
    notes?: string
  ): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.put(`casa/v1/cases/${caseId}/status`, {
        status,
        status_notes: notes,
        status_date: new Date().toISOString(),
      });
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update case status',
      };
    }
  }

  // Get case contact logs
  async getCaseContactLogs(
    caseId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<ContactLogsAPIResponse>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: limit.toString(),
      });

      const response = await apiClient.get(`casa/v1/cases/${caseId}/contact-logs?${params.toString()}`);
      return response as ApiResponse<ContactLogsAPIResponse>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch contact logs',
      };
    }
  }

  // Add contact log to case
  async addContactLog(contactData: {
    caseId: string;
    contactDate: string;
    contactTime?: string;
    contactType: string;
    contactWith: string;
    duration?: number;
    location?: string;
    notes: string;
    followUpNeeded?: string;
    nextContactDate?: string;
  }): Promise<ApiResponse<ContactLog>> {
    try {
      const response = await apiClient.post('casa/v1/contact-logs', contactData);
      return response as ApiResponse<ContactLog>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add contact log',
      };
    }
  }

  // Get case documents
  async getCaseDocuments(
    caseId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<DocumentsAPIResponse>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: limit.toString(),
      });

      const response = await apiClient.get(`casa/v1/cases/${caseId}/documents?${params.toString()}`);
      return response as ApiResponse<DocumentsAPIResponse>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch case documents',
      };
    }
  }

  // Upload document to case
  async uploadDocument(
    caseId: string,
    file: File,
    documentType: string,
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<CaseDocument>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('case_id', caseId);
      formData.append('document_type', documentType);
      if (description) formData.append('description', description);

      const response = await apiClient.uploadFile(
        'casa/v1/documents/upload',
        file,
        'file',
        onProgress
      );
      return response as ApiResponse<CaseDocument>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to upload document',
      };
    }
  }

  // Get case timeline/history
  async getCaseTimeline(caseId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get(`casa/v1/cases/${caseId}/timeline`);
      return response as ApiResponse<any[]>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch case timeline',
      };
    }
  }

  // Generate case report
  async generateCaseReport(
    caseId: string,
    reportType: 'court' | 'monthly' | 'annual' = 'court',
    dateRange?: { start: string; end: string }
  ): Promise<ApiResponse<{ reportUrl: string }>> {
    try {
      const params = {
        report_type: reportType,
        ...(dateRange && { start_date: dateRange.start, end_date: dateRange.end }),
      };

      const response = await apiClient.post(`casa/v1/cases/${caseId}/reports`, params);
      return response as ApiResponse<{ reportUrl: string }>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate case report',
      };
    }
  }

  // Close case
  async closeCase(
    caseId: string,
    closureReason: string,
    outcome: string,
    notes?: string
  ): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.post(`casa/v1/cases/${caseId}/close`, {
        closure_reason: closureReason,
        outcome,
        closure_notes: notes,
        closure_date: new Date().toISOString(),
      });
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to close case',
      };
    }
  }

  // Transfer case to another volunteer
  async transferCase(
    caseId: string,
    fromVolunteerId: string,
    toVolunteerId: string,
    reason: string
  ): Promise<ApiResponse<CasaCase>> {
    try {
      const response = await apiClient.post(`casa/v1/cases/${caseId}/transfer`, {
        from_volunteer_id: fromVolunteerId,
        to_volunteer_id: toVolunteerId,
        transfer_reason: reason,
        transfer_date: new Date().toISOString(),
      });
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to transfer case',
      };
    }
  }

  // Get cases by volunteer
  async getCasesByVolunteer(
    volunteerId: string,
    includeInactive: boolean = false
  ): Promise<ApiResponse<CasaCase[]>> {
    try {
      const params = new URLSearchParams({
        volunteer_id: volunteerId,
        include_inactive: includeInactive.toString(),
      });

      const response = await apiClient.get(`casa/v1/cases/by-volunteer?${params.toString()}`);
      return response as ApiResponse<CasaCase[]>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteer cases',
      };
    }
  }

  // Search cases
  async searchCases(
    query: string,
    filters?: {
      caseType?: string;
      status?: string;
      priority?: string;
    }
  ): Promise<ApiResponse<CasaCase[]>> {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(filters?.caseType && { case_type: filters.caseType }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.priority && { priority: filters.priority }),
      });

      const response = await apiClient.get(`casa/v1/cases/search?${params.toString()}`);
      return response as ApiResponse<CasaCase[]>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search cases',
      };
    }
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get('casa/v1/dashboard-stats');
      return response as ApiResponse<CasaCase>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch dashboard statistics',
      };
    }
  }
}

// Export singleton instance
export const caseService = new CaseService();
export default caseService;