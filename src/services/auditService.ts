import apiClient from './apiClient';

// Audit log entry interface
export interface AuditLogEntry {
  id: number;
  organization_id: number | null;
  organization_name?: string;
  user_id: number;
  user_email: string;
  user_role: string;
  action_type: string;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  resource_identifier: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  ip_address: string;
  user_agent?: string;
  request_uri?: string;
  status: 'success' | 'failure' | 'denied';
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

// Filters for querying audit logs
export interface AuditLogFilters {
  action_type?: string;
  user_id?: number;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
  severity?: string;
  status?: string;
  organization_id?: number | string;
  search?: string;
  page?: number;
  per_page?: number;
}

// Response structure from API
export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Action types for filtering
export const AUDIT_ACTION_TYPES = [
  { value: 'auth', label: 'Authentication' },
  { value: 'case', label: 'Cases' },
  { value: 'volunteer', label: 'Volunteers' },
  { value: 'document', label: 'Documents' },
  { value: 'contact_log', label: 'Contact Logs' },
  { value: 'court_hearing', label: 'Court Hearings' },
  { value: 'task', label: 'Tasks' },
  { value: 'user', label: 'Users' },
  { value: 'settings', label: 'Settings' },
  { value: 'tenant', label: 'Tenants' },
  { value: 'security', label: 'Security' },
] as const;

// Severity levels
export const AUDIT_SEVERITY_LEVELS = [
  { value: 'info', label: 'Info', color: 'blue' },
  { value: 'warning', label: 'Warning', color: 'yellow' },
  { value: 'critical', label: 'Critical', color: 'red' },
] as const;

// Status options
export const AUDIT_STATUS_OPTIONS = [
  { value: 'success', label: 'Success', color: 'green' },
  { value: 'failure', label: 'Failure', color: 'red' },
  { value: 'denied', label: 'Denied', color: 'orange' },
] as const;

class AuditService {
  /**
   * Get audit logs for the current user's organization (tenant view)
   */
  async getTenantLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await apiClient.casaGet<{ success: boolean; data: AuditLogsResponse }>(
      `audit-logs?${params.toString()}`
    );

    if (response.success && response.data?.data) {
      return response.data.data;
    }

    throw new Error(response.error || 'Failed to fetch audit logs');
  }

  /**
   * Get audit logs for all organizations (super admin view)
   */
  async getSuperAdminLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await apiClient.casaGet<{ success: boolean; data: AuditLogsResponse }>(
      `super-admin/audit-logs?${params.toString()}`
    );

    if (response.success && response.data?.data) {
      return response.data.data;
    }

    throw new Error(response.error || 'Failed to fetch audit logs');
  }

  /**
   * Export tenant audit logs as CSV
   */
  async exportTenantLogs(filters: AuditLogFilters = {}): Promise<string> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await apiClient.casaGet<string>(`audit-logs/export?${params.toString()}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to export audit logs');
  }

  /**
   * Export super admin audit logs as CSV
   */
  async exportSuperAdminLogs(filters: AuditLogFilters = {}): Promise<string> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await apiClient.casaGet<string>(`super-admin/audit-logs/export?${params.toString()}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to export audit logs');
  }

  /**
   * Download audit logs as a CSV file
   */
  downloadCsv(csvContent: string, filename?: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Format action type for display
   */
  formatActionType(actionType: string): string {
    const found = AUDIT_ACTION_TYPES.find(t => t.value === actionType);
    return found?.label || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format action for display
   */
  formatAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity: string): string {
    const found = AUDIT_SEVERITY_LEVELS.find(s => s.value === severity);
    return found?.color || 'gray';
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    const found = AUDIT_STATUS_OPTIONS.find(s => s.value === status);
    return found?.color || 'gray';
  }
}

export const auditService = new AuditService();
export default auditService;
