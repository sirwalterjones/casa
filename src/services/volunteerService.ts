import { apiClient } from './apiClient';
import { Volunteer, CasaCase, ApiResponse, PipelineActionRequest } from '@/types';

export class VolunteerService {
  // Get all volunteers for current organization
  async getVolunteers(filters?: {
    isActive?: boolean;
    hasActiveCases?: boolean;
    trainingStatus?: string;
    backgroundCheckStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ volunteers: Volunteer[]; pagination: any }>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.isActive !== undefined) params.append('is_active', filters.isActive.toString());
      if (filters?.hasActiveCases !== undefined) params.append('has_active_cases', filters.hasActiveCases.toString());
      if (filters?.trainingStatus) params.append('training_status', filters.trainingStatus);
      if (filters?.backgroundCheckStatus) params.append('background_check_status', filters.backgroundCheckStatus);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('per_page', filters.limit.toString());

      const response = await apiClient.get(`casa/v1/volunteers?${params.toString()}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteers',
      };
    }
  }

  // Get single volunteer by ID
  async getVolunteer(volunteerId: string): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.get(`casa/v1/volunteers/${volunteerId}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteer',
      };
    }
  }

  // Create new volunteer
  async createVolunteer(volunteerData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    address?: string;
    dateOfBirth?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phoneNumber: string;
    };
    availability?: {
      preferredDays?: string[];
      preferredTimes?: string[];
      maxCases?: number;
    };
  }): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.post('casa/v1/volunteers', volunteerData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create volunteer',
      };
    }
  }

  // Update existing volunteer
  async updateVolunteer(volunteerId: string, updates: Partial<Volunteer>): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.put(`casa/v1/volunteers/${volunteerId}`, updates);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update volunteer',
      };
    }
  }

  // Delete volunteer
  async deleteVolunteer(volunteerId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.delete(`casa/v1/volunteers/${volunteerId}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete volunteer',
      };
    }
  }

  // Activate volunteer
  async activateVolunteer(volunteerId: string): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.post(`casa/v1/volunteers/${volunteerId}/activate`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to activate volunteer',
      };
    }
  }

  // Deactivate volunteer
  async deactivateVolunteer(volunteerId: string, reason?: string): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.post(`casa/v1/volunteers/${volunteerId}/deactivate`, {
        reason,
        deactivation_date: new Date().toISOString(),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to deactivate volunteer',
      };
    }
  }

  // Update volunteer training information
  async updateTraining(
    volunteerId: string,
    trainingData: {
      initialTrainingDate?: string;
      certificationExpiry?: string;
      additionalTraining?: string[];
      isActive: boolean;
    }
  ): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.put(`casa/v1/volunteers/${volunteerId}/training`, {
        training: trainingData,
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update training information',
      };
    }
  }

  // Update background check status
  async updateBackgroundCheck(
    volunteerId: string,
    backgroundCheckData: {
      status: 'pending' | 'approved' | 'denied' | 'expired';
      expiryDate?: string;
      checkDate?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.put(`casa/v1/volunteers/${volunteerId}/background-check`, {
        background_check: backgroundCheckData,
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update background check',
      };
    }
  }

  // Get volunteer's cases
  async getVolunteerCases(
    volunteerId: string,
    includeInactive: boolean = false
  ): Promise<ApiResponse<CasaCase[]>> {
    try {
      const params = new URLSearchParams({
        include_inactive: includeInactive.toString(),
      });

      const response = await apiClient.get(`casa/v1/volunteers/${volunteerId}/cases?${params.toString()}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteer cases',
      };
    }
  }

  // Get volunteer's contact logs
  async getVolunteerContactLogs(
    volunteerId: string,
    dateRange?: { start: string; end: string },
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<any>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: limit.toString(),
      });

      if (dateRange) {
        params.append('start_date', dateRange.start);
        params.append('end_date', dateRange.end);
      }

      const response = await apiClient.get(`casa/v1/volunteers/${volunteerId}/contact-logs?${params.toString()}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteer contact logs',
      };
    }
  }

  // Update volunteer availability
  async updateAvailability(
    volunteerId: string,
    availability: {
      preferredDays?: string[];
      preferredTimes?: string[];
      maxCases?: number;
      notes?: string;
    }
  ): Promise<ApiResponse<Volunteer>> {
    try {
      const response = await apiClient.put(`casa/v1/volunteers/${volunteerId}/availability`, {
        availability,
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update availability',
      };
    }
  }

  // Get available volunteers for case assignment
  async getAvailableVolunteers(filters?: {
    maxCases?: number;
    trainingActive?: boolean;
    backgroundCheckValid?: boolean;
    preferredDays?: string[];
  }): Promise<ApiResponse<Volunteer[]>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.maxCases) params.append('max_cases', filters.maxCases.toString());
      if (filters?.trainingActive !== undefined) params.append('training_active', filters.trainingActive.toString());
      if (filters?.backgroundCheckValid !== undefined) params.append('background_check_valid', filters.backgroundCheckValid.toString());
      if (filters?.preferredDays) params.append('preferred_days', filters.preferredDays.join(','));

      const response = await apiClient.get(`casa/v1/volunteers/available?${params.toString()}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch available volunteers',
      };
    }
  }

  // Generate volunteer report
  async generateVolunteerReport(
    volunteerId: string,
    reportType: 'activity' | 'performance' | 'training' = 'activity',
    dateRange?: { start: string; end: string }
  ): Promise<ApiResponse<{ reportUrl: string }>> {
    try {
      const params = {
        report_type: reportType,
        ...(dateRange && { start_date: dateRange.start, end_date: dateRange.end }),
      };

      const response = await apiClient.post(`casa/v1/volunteers/${volunteerId}/reports`, params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate volunteer report',
      };
    }
  }

  // Search volunteers
  async searchVolunteers(
    query: string,
    filters?: {
      isActive?: boolean;
      trainingStatus?: string;
      backgroundCheckStatus?: string;
    }
  ): Promise<ApiResponse<Volunteer[]>> {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(filters?.isActive !== undefined && { is_active: filters.isActive.toString() }),
        ...(filters?.trainingStatus && { training_status: filters.trainingStatus }),
        ...(filters?.backgroundCheckStatus && { background_check_status: filters.backgroundCheckStatus }),
      });

      const response = await apiClient.get(`casa/v1/volunteers/search?${params.toString()}`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search volunteers',
      };
    }
  }

  // Bulk update volunteers
  async bulkUpdateVolunteers(
    volunteerIds: string[],
    updates: {
      isActive?: boolean;
      trainingReminder?: boolean;
      backgroundCheckReminder?: boolean;
    }
  ): Promise<ApiResponse<{ updated: number; errors: any[] }>> {
    try {
      const response = await apiClient.post('casa/v1/volunteers/bulk-update', {
        volunteer_ids: volunteerIds,
        updates,
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to bulk update volunteers',
      };
    }
  }

  // Send training reminder
  async sendTrainingReminder(volunteerId: string, message?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post(`casa/v1/volunteers/${volunteerId}/training-reminder`, {
        custom_message: message,
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send training reminder',
      };
    }
  }

  // Send background check reminder
  async sendBackgroundCheckReminder(volunteerId: string, message?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post(`casa/v1/volunteers/${volunteerId}/background-check-reminder`, {
        custom_message: message,
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send background check reminder',
      };
    }
  }

  // Get volunteer statistics
  async getVolunteerStats(volunteerId: string): Promise<ApiResponse<{
    totalCases: number;
    activeCases: number;
    completedCases: number;
    totalContactLogs: number;
    averageContactsPerMonth: number;
    lastContactDate: string;
    trainingStatus: string;
    backgroundCheckStatus: string;
  }>> {
    try {
      const response = await apiClient.get(`casa/v1/volunteers/${volunteerId}/stats`);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteer statistics',
      };
    }
  }

  // Import volunteers from CSV
  async importVolunteers(file: File): Promise<ApiResponse<{
    imported: number;
    errors: Array<{ row: number; error: string; data: any }>;
  }>> {
    try {
      const response = await apiClient.uploadFile(
        'casa/v1/volunteers/import',
        file,
        'csv_file'
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to import volunteers',
      };
    }
  }

  // Export volunteers to CSV
  async exportVolunteers(filters?: {
    isActive?: boolean;
    includeInactive?: boolean;
    trainingStatus?: string;
  }): Promise<ApiResponse<{ downloadUrl: string }>> {
    try {
      const params = {
        ...(filters?.isActive !== undefined && { is_active: filters.isActive }),
        ...(filters?.includeInactive !== undefined && { include_inactive: filters.includeInactive }),
        ...(filters?.trainingStatus && { training_status: filters.trainingStatus }),
      };

      const response = await apiClient.post('casa/v1/volunteers/export', params);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to export volunteers',
      };
    }
  }

  // ============================================================================
  // PIPELINE WORKFLOW METHODS
  // ============================================================================

  /**
   * Get volunteers grouped by pipeline status for Kanban board view
   */
  async getVolunteersByPipeline(): Promise<ApiResponse<{
    applied: Volunteer[];
    background_check: Volunteer[];
    training: Volunteer[];
    active: Volunteer[];
    rejected: Volunteer[];
  }>> {
    try {
      const response = await apiClient.get<{ volunteers: Volunteer[]; pagination: any }>(
        'casa/v1/volunteers'
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to fetch volunteers',
        };
      }

      // Group volunteers by status
      const volunteers = response.data.volunteers || [];
      const grouped = {
        applied: [] as Volunteer[],
        background_check: [] as Volunteer[],
        training: [] as Volunteer[],
        active: [] as Volunteer[],
        rejected: [] as Volunteer[],
      };

      volunteers.forEach((volunteer: any) => {
        const status = volunteer.volunteer_status || volunteer.volunteerStatus || 'applied';

        // Transform snake_case to camelCase
        const transformedVolunteer: Volunteer = {
          id: String(volunteer.id),
          userId: volunteer.user_id ? String(volunteer.user_id) : null,
          firstName: volunteer.first_name || volunteer.firstName || '',
          lastName: volunteer.last_name || volunteer.lastName || '',
          email: volunteer.email || '',
          phone: volunteer.phone || '',
          dateOfBirth: volunteer.date_of_birth || volunteer.dateOfBirth,
          address: volunteer.address ? {
            street: volunteer.address,
            city: volunteer.city || '',
            state: volunteer.state || '',
            zipCode: volunteer.zip_code || volunteer.zipCode || '',
          } : undefined,
          emergencyContact: volunteer.emergency_contact_name ? {
            name: volunteer.emergency_contact_name,
            relationship: volunteer.emergency_contact_relationship || '',
            phone: volunteer.emergency_contact_phone || '',
          } : undefined,
          backgroundCheckStatus: volunteer.background_check_status || 'pending',
          backgroundCheckDate: volunteer.background_check_date,
          trainingStatus: volunteer.training_status || 'not_started',
          trainingCompletedDate: volunteer.training_completion_date,
          volunteerStatus: status,
          isActive: status === 'active',
          organizationId: String(volunteer.organization_id || volunteer.organizationId || ''),
          applicationDate: volunteer.application_date,
          approvedAt: volunteer.approved_at,
          approvedBy: volunteer.approved_by ? String(volunteer.approved_by) : undefined,
          rejectedAt: volunteer.rejected_at,
          rejectionReason: volunteer.rejection_reason,
          createdAt: volunteer.created_at || volunteer.createdAt || '',
          updatedAt: volunteer.updated_at || volunteer.updatedAt || '',
        };

        if (status in grouped) {
          grouped[status as keyof typeof grouped].push(transformedVolunteer);
        } else {
          // Default to applied for unknown statuses
          grouped.applied.push(transformedVolunteer);
        }
      });

      return {
        success: true,
        data: grouped,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch volunteers by pipeline',
      };
    }
  }

  /**
   * Execute a pipeline action on a volunteer
   */
  async updatePipelineStatus(
    volunteerId: string,
    action: PipelineActionRequest['action'],
    notes?: string,
    rejectionReason?: string
  ): Promise<ApiResponse<{
    id: string;
    action: string;
    oldStatus: string;
    newStatus: string;
    userCreated?: boolean;
    username?: string;
    temporaryPassword?: string;
    welcomeEmailSent?: boolean;
  }>> {
    try {
      const response = await apiClient.post(`casa/v1/volunteers/${volunteerId}/pipeline-action`, {
        action,
        notes,
        rejection_reason: rejectionReason,
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to update pipeline status',
        };
      }

      const data = response.data as any;
      return {
        success: true,
        data: {
          id: String(data.id),
          action: data.action,
          oldStatus: data.old_status,
          newStatus: data.new_status,
          userCreated: data.user_created,
          username: data.username,
          temporaryPassword: data.temporary_password,
          welcomeEmailSent: data.welcome_email_sent,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update pipeline status',
      };
    }
  }

  /**
   * Approve volunteer and create user account (convenience method)
   */
  async approveAndCreateAccount(
    volunteerId: string,
    notes?: string
  ): Promise<ApiResponse<{
    id: string;
    username: string;
    temporaryPassword: string;
    welcomeEmailSent: boolean;
  }>> {
    try {
      const response = await this.updatePipelineStatus(volunteerId, 'approve_volunteer', notes);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to approve volunteer',
        };
      }

      return {
        success: true,
        data: {
          id: response.data.id,
          username: response.data.username || '',
          temporaryPassword: response.data.temporaryPassword || '',
          welcomeEmailSent: response.data.welcomeEmailSent || false,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to approve volunteer and create account',
      };
    }
  }
}

// Export singleton instance
export const volunteerService = new VolunteerService();
export default volunteerService;