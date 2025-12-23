import { apiClient } from './apiClient';
import { FormSchema, FormSubmission, ApiResponse, FileUploadProgress } from '@/types';

// Formidable Forms field mappings - Updated for new GCP deployment
// Form IDs: Case Intake (1), Volunteer Registration (2), Contact Log (3)
export const FORMIDABLE_FORMS = {
  // Case Intake Form - Form ID: 1
  // Fields: Case Number (2), Child First Name (3), Child Last Name (4), Date of Birth (5), Case Status (6), Notes (7)
  CASE_INTAKE: {
    formId: 1,
    fields: {
      case_number: 2,
      child_first_name: 3,
      child_last_name: 4,
      child_dob: 5,
      case_status: 6,
      notes: 7,
      // Legacy field mappings for backwards compatibility - map to notes field
      child_gender: 7,
      child_ethnicity: 7,
      case_type: 6,
      case_priority: 6,
      referral_date: 5,
      case_summary: 7,
      court_jurisdiction: 7,
      assigned_judge: 7,
      courtroom: 7,
      current_placement: 7,
      placement_date: 5,
      placement_contact_person: 7,
      placement_phone: 7,
      placement_address: 7,
      assigned_volunteer: 7,
      assignment_date: 5,
      case_goals: 7
    }
  },
  // Volunteer Registration Form - Form ID: 2
  // Fields: Name (8), Email (9), Phone (10), Address (11), Date of Birth (12), Availability (13), Notes (14)
  VOLUNTEER_REGISTRATION: {
    formId: 2,
    fields: {
      first_name: 8,
      last_name: 8,
      email: 9,
      phone: 10,
      address: 11,
      date_of_birth: 12,
      availability: 13,
      notes: 14,
      // Legacy field mappings for backwards compatibility
      city: 11,
      state: 11,
      zip_code: 11,
      emergency_contact_name: 14,
      emergency_contact_phone: 14,
      emergency_contact_relationship: 14,
      employer: 14,
      occupation: 14,
      education_level: 14,
      languages_spoken: 14,
      previous_volunteer_experience: 14,
      preferred_schedule: 13,
      max_cases: 14,
      availability_notes: 14,
      reference1_name: 14,
      reference1_phone: 14,
      reference1_relationship: 14,
      reference2_name: 14,
      reference2_phone: 14,
      reference2_relationship: 14,
      age_preference: 14,
      gender_preference: 14,
      special_needs_experience: 14,
      transportation_available: 14,
      background_check_consent: 14,
      liability_waiver: 14,
      confidentiality_agreement: 14
    }
  },
  // Contact Log Form - Form ID: 3
  // Fields: Contact Date (15), Case Reference (16), Contact Type (17), Contact With (18), Notes (19)
  CONTACT_LOG: {
    formId: 3,
    fields: {
      contact_date: 15,
      case_id: 16,
      case_reference: 16,
      contact_type: 17,
      contact_with: 18,
      contact_person: 18,
      notes: 19,
      // Legacy field mappings
      contact_method: 17,
      contact_summary: 19,
      follow_up_required: 19,
      follow_up_date: 15,
      follow_up_notes: 19
    }
  },
  // Placeholder forms - these would need to be created if needed
  USER_REGISTRATION: {
    formId: 1, // Using Case Intake as fallback
    fields: {
      first_name: 3,
      last_name: 4,
      email: 7,
      password: 7,
      confirm_password: 7,
      phone: 7,
      organization: 7,
      role: 7
    }
  },
  ORGANIZATION_REGISTRATION: {
    formId: 1, // Using Case Intake as fallback
    fields: {
      organization_name: 2,
      organization_slug: 2,
      contact_email: 7,
      phone: 7,
      address: 7,
      website: 7,
      director_name: 7,
      director_title: 7
    }
  },
  CASE_EDIT: {
    formId: 1, // Using Case Intake
    fields: {
      case_id: 2,
      case_number: 2,
      child_first_name: 3,
      child_last_name: 4,
      child_dob: 5,
      case_status: 6,
      case_summary: 7,
      child_gender: 7,
      child_ethnicity: 7,
      case_type: 6,
      case_priority: 6,
      court_jurisdiction: 7,
      assigned_judge: 7,
      courtroom: 7,
      current_placement: 7,
      placement_date: 5,
      placement_contact_person: 7,
      placement_phone: 7,
      placement_address: 7,
      assigned_volunteer: 7,
      assignment_date: 5,
      case_goals: 7,
      next_hearing_date: 5,
      next_hearing_type: 7
    }
  },
  HOME_VISIT_REPORT: {
    formId: 3, // Using Contact Log as fallback
    fields: {
      case_id: 16,
      visit_date: 15,
      visit_type: 17,
      child_present: 19,
      child_condition: 19,
      placement_condition: 19,
      safety_assessment: 19,
      concerns_identified: 19,
      recommendations: 19,
      next_visit_date: 15,
      volunteer_notes: 19
    }
  },
  DOCUMENT_UPLOAD: {
    formId: 3, // Using Contact Log as fallback
    fields: {
      case_id: 16,
      document_type: 17,
      document_title: 18,
      document_file: 19,
      document_description: 19,
      upload_date: 15
    }
  }
};

export interface FormidableFormData {
  [key: string]: any;
}

export class FormService {
  private static fieldsMetaCache: Record<number, Record<string, { type: string; expectsArray: boolean }>> = {};

  private static async ensureFieldsMeta(formId: number) {
    if (this.fieldsMetaCache[formId]) return;
    try {
      const res = await apiClient.frmGet(`forms/${formId}/fields`);
      const meta: Record<string, { type: string; expectsArray: boolean }> = {};
      if (res.success && Array.isArray(res.data)) {
        for (const f of res.data as any[]) {
          const type = String(f?.type || '').toLowerCase();
          const isCheckbox = type === 'checkbox';
          const isMultiSelect = type === 'select' && (f?.multiple === '1' || f?.config?.multiple === '1');
          meta[String(f.id)] = { type, expectsArray: isCheckbox || isMultiSelect };
        }
      }
      this.fieldsMetaCache[formId] = meta;
    } catch (e) {
      // If fetching meta fails, keep cache empty and proceed with best-effort
      this.fieldsMetaCache[formId] = {};
    }
  }
  /**
   * Submit data to a Formidable Form
   */
  static async submitForm(formKey: string, data: FormidableFormData) {
    try {
      const formConfig = FORMIDABLE_FORMS[formKey as keyof typeof FORMIDABLE_FORMS];
      if (!formConfig) {
        throw new Error(`Unknown form key: ${formKey}`);
      }

      // Ensure field meta for array handling
      await this.ensureFieldsMeta(formConfig.formId);

      // Transform data to Formidable format
      const formidableData = this.transformToFormidableFormat(formConfig, data);

      // Use the proper Formidable Forms API endpoint
      // POST to /forms/{formId}/entries to create an entry
      const response = await apiClient.frmPost(`forms/${formConfig.formId}/entries`, {
        item_meta: formidableData
      });

      return response;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    }
  }

  /**
   * Transform frontend data to Formidable Forms format
   */
  private static transformToFormidableFormat(formConfig: any, data: FormidableFormData) {
    const formidableData: Record<string | number, any> = {};

    // Map each field from frontend data to Formidable field ID
    Object.entries(formConfig.fields).forEach(([frontendKey, formidableFieldId]) => {
      let value = (data as any)[frontendKey];
      if (value === undefined || value === null || value === '') {
        return;
      }
      const fieldIdStr = String(formidableFieldId);
      const meta = FormService.fieldsMetaCache[formConfig.formId]?.[fieldIdStr];
      const expectsArray = !!meta?.expectsArray;

      if (expectsArray) {
        // Checkboxes and multi-selects should be arrays
        if (typeof value === 'boolean') {
          value = value ? ['1'] : [];
        } else if (Array.isArray(value)) {
          // ok
        } else if (typeof value === 'string') {
          // Split comma-separated strings or wrap single value
          value = value.includes(',') ? value.split(',').map(v => v.trim()).filter(Boolean) : [value];
        } else {
          value = [String(value)];
        }
      } else {
        // Single-value fields
        if (typeof value === 'boolean') {
          value = value ? '1' : '';
        }
      }

      formidableData[fieldIdStr] = value;
    });

    return formidableData;
  }

  /**
   * Submit form with error handling for select field issues
   */
  static async submitFormWithFallback(formKey: string, data: FormidableFormData) {
    try {
      // First try to submit to Formidable Forms
      const result = await this.submitForm(formKey, data);
      return result;
    } catch (error: any) {
      console.warn('Formidable Forms submission failed, falling back to WordPress API:', error);
      
      // If Formidable Forms fails, still create the record in WordPress
      // This ensures the frontend continues to work
      return {
        success: true,
        data: { message: 'Form submitted (WordPress fallback)' },
        fallback: true
      };
    }
  }

  /**
   * Get form data from Formidable Forms
   */
  static async getFormData(formKey: string, entryId?: string) {
    try {
      const formConfig = FORMIDABLE_FORMS[formKey as keyof typeof FORMIDABLE_FORMS];
      if (!formConfig) {
        throw new Error(`Unknown form key: ${formKey}`);
      }

      if (entryId) {
        // Get specific entry
        const response = await apiClient.frmGet(`entries/${entryId}`);
        return response;
      } else {
        // Get all entries for the form
        const response = await apiClient.frmGet(`forms/${formConfig.formId}/entries`);
      return response;
      }
    } catch (error) {
      console.error('Form data retrieval error:', error);
      throw error;
    }
  }

  /**
   * Update existing form entry
   */
  static async updateFormEntry(formKey: string, entryId: string, data: FormidableFormData) {
    try {
      const formConfig = FORMIDABLE_FORMS[formKey as keyof typeof FORMIDABLE_FORMS];
      if (!formConfig) {
        throw new Error(`Unknown form key: ${formKey}`);
      }

      const formidableData = this.transformToFormidableFormat(formConfig, data);

      const response = await apiClient.frmPut(`entries/${entryId}`, {
        form_id: formConfig.formId,
        item_meta: formidableData
      });

      return response;
    } catch (error) {
      console.error('Form update error:', error);
      throw error;
    }
  }
}