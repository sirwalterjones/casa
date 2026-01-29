import axios from 'axios';
import { ApiResponse, VolunteerApplicationData, OrganizationPublicInfo, ApplicationSubmissionResponse } from '@/types';

/**
 * Service for public volunteer applications (no authentication required)
 */
class VolunteerApplicationService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_WORDPRESS_URL ||
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
  }

  /**
   * Get public organization info by slug (for application form)
   */
  async getOrganizationPublicInfo(slug: string): Promise<ApiResponse<OrganizationPublicInfo>> {
    try {
      const response = await axios.get(
        `${this.baseURL}/wp-json/casa/v1/organizations/${slug}/public`,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to get organization info',
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Submit a public volunteer application
   */
  async submitApplication(
    organizationSlug: string,
    applicationData: VolunteerApplicationData
  ): Promise<ApiResponse<ApplicationSubmissionResponse>> {
    try {
      // Convert camelCase to snake_case for PHP backend
      const payload = {
        organization_slug: organizationSlug,
        first_name: applicationData.firstName,
        last_name: applicationData.lastName,
        email: applicationData.email,
        phone: applicationData.phone,
        date_of_birth: applicationData.dateOfBirth,
        address: applicationData.address,
        city: applicationData.city,
        state: applicationData.state,
        zip_code: applicationData.zipCode,
        emergency_contact_name: applicationData.emergencyContactName,
        emergency_contact_phone: applicationData.emergencyContactPhone,
        emergency_contact_relationship: applicationData.emergencyContactRelationship,
        employer: applicationData.employer || '',
        occupation: applicationData.occupation || '',
        education_level: applicationData.educationLevel || '',
        languages_spoken: applicationData.languagesSpoken || '',
        previous_volunteer_experience: applicationData.previousVolunteerExperience || '',
        preferred_schedule: applicationData.preferredSchedule || '',
        max_cases: applicationData.maxCases,
        availability_notes: applicationData.availabilityNotes || '',
        reference1_name: applicationData.reference1Name,
        reference1_phone: applicationData.reference1Phone,
        reference1_relationship: applicationData.reference1Relationship,
        reference2_name: applicationData.reference2Name,
        reference2_phone: applicationData.reference2Phone,
        reference2_relationship: applicationData.reference2Relationship,
        age_preference: applicationData.agePreference || '',
        gender_preference: applicationData.genderPreference || '',
        special_needs_experience: applicationData.specialNeedsExperience || false,
        transportation_available: applicationData.transportationAvailable || false,
        background_check_consent: applicationData.backgroundCheckConsent,
        liability_waiver: applicationData.liabilityWaiver,
        confidentiality_agreement: applicationData.confidentialityAgreement,
      };

      const response = await axios.post(
        `${this.baseURL}/wp-json/casa/v1/volunteer-applications`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        return {
          success: true,
          data: {
            success: true,
            referenceNumber: response.data.data.reference_number,
            message: response.data.data.message,
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to submit application',
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): ApiResponse<any> {
    let errorMessage: string = 'An unexpected error occurred';

    if (error.response) {
      const msg = error.response.data?.message;
      if (typeof msg === 'string') {
        errorMessage = msg;
      } else if (error.response.status === 429) {
        errorMessage = 'Too many submission attempts. Please try again later.';
      } else {
        errorMessage = error.response.statusText || errorMessage;
      }
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      errorMessage = error.message || errorMessage;
    }

    console.error('Volunteer Application API Error:', error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Export singleton instance
export const volunteerApplicationService = new VolunteerApplicationService();
export default volunteerApplicationService;
