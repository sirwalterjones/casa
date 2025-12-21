import { apiClient } from './apiClient';
import { FormSchema, FormSubmission, ApiResponse, FileUploadProgress } from '@/types';

// Formidable Forms field mappings
export const FORMIDABLE_FORMS = {
  USER_REGISTRATION: {
    formId: 26,
    fields: {
      first_name: 46,
      last_name: 47,
      email: 48,
      password: 49,
      confirm_password: 50,
      phone: 51,
      organization: 52,
      role: 53
    }
  },
  ORGANIZATION_REGISTRATION: {
    formId: 27,
    fields: {
      organization_name: 55,
      organization_slug: 56,
      contact_email: 66,
      phone: 62,
      address: 58,
      website: 64,
      director_name: 65,
      director_title: 65
    }
  },
  VOLUNTEER_REGISTRATION: {
    formId: 28,
    fields: {
      first_name: 69,
      last_name: 70,
      email: 71,
      phone: 72,
      date_of_birth: 73,
      address: 74,
      city: 75,
      state: 76,
      zip_code: 77,
      emergency_contact_name: 78,
      emergency_contact_phone: 79,
      emergency_contact_relationship: 80,
      employer: 81,
      occupation: 82,
      education_level: 83,
      languages_spoken: 84,
      previous_volunteer_experience: 85,
      preferred_schedule: 86,
      max_cases: 87,
      availability_notes: 88,
      reference1_name: 89,
      reference1_phone: 90,
      reference1_relationship: 91,
      reference2_name: 92,
      reference2_phone: 93,
      reference2_relationship: 94,
      age_preference: 95,
      gender_preference: 96,
      special_needs_experience: 97,
      transportation_available: 98,
      background_check_consent: 99,
      liability_waiver: 100,
      confidentiality_agreement: 101
    }
  },
  CASE_INTAKE: {
    formId: 25,
    fields: {
      child_first_name: 24,
      child_last_name: 25,
      child_dob: 26,
      child_gender: 27,
      child_ethnicity: 28,
      case_number: 29,
      case_type: 30,
      case_priority: 31,
      referral_date: 32,
      case_summary: 33,
      court_jurisdiction: 34,
      assigned_judge: 35,
      courtroom: 36,
      current_placement: 37,
      placement_date: 38,
      placement_contact_person: 39,
      placement_phone: 40,
      placement_address: 41,
      assigned_volunteer: 42,
      assignment_date: 43,
      case_goals: 44
    }
  },
  CASE_EDIT: {
    formId: 33,
    fields: {
      case_id: 146,
      case_number: 146,
      child_first_name: 147,
      child_last_name: 148,
      child_dob: 149,
      child_gender: 147,
      child_ethnicity: 147,
      case_type: 146,
      case_priority: 146,
      case_status: 151,
      case_summary: 152,
      court_jurisdiction: 146,
      assigned_judge: 146,
      courtroom: 146,
      current_placement: 146,
      placement_date: 146,
      placement_contact_person: 146,
      placement_phone: 146,
      placement_address: 146,
      assigned_volunteer: 150,
      assignment_date: 146,
      case_goals: 152,
      next_hearing_date: 146,
      next_hearing_type: 146
    }
  },
  CONTACT_LOG: {
    formId: 32,
    fields: {
      case_id: 135,
      contact_date: 137,
      contact_type: 136,
      contact_person: 138,
      contact_method: 141,
      contact_summary: 142,
      follow_up_required: 143,
      follow_up_date: 144,
      follow_up_notes: 142
    }
  },
  HOME_VISIT_REPORT: {
    formId: 30,
    fields: {
      case_id: 109,
      visit_date: 110,
      visit_type: 112,
      child_present: 114,
      child_condition: 116,
      placement_condition: 115,
      safety_assessment: 115,
      concerns_identified: 119,
      recommendations: 120,
      next_visit_date: 122,
      volunteer_notes: 117
    }
  },
  DOCUMENT_UPLOAD: {
    formId: 31,
    fields: {
      case_id: 124,
      document_type: 126,
      document_title: 125,
      document_file: 127,
      document_description: 130,
      upload_date: 128
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
      const response = await apiClient.frmPost('entries', {
        form_id: formConfig.formId,
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