// Case Types
export const CASE_TYPES = {
  ABUSE: 'abuse',
  NEGLECT: 'neglect',
  DEPENDENCY: 'dependency',
  TERMINATION: 'termination',
  ADOPTION: 'adoption',
  GUARDIANSHIP: 'guardianship',
  OTHER: 'other',
} as const;

export const CASE_TYPE_LABELS = {
  [CASE_TYPES.ABUSE]: 'Physical/Sexual Abuse',
  [CASE_TYPES.NEGLECT]: 'Neglect',
  [CASE_TYPES.DEPENDENCY]: 'Dependency',
  [CASE_TYPES.TERMINATION]: 'Termination of Parental Rights',
  [CASE_TYPES.ADOPTION]: 'Adoption',
  [CASE_TYPES.GUARDIANSHIP]: 'Guardianship',
  [CASE_TYPES.OTHER]: 'Other',
} as const;

// Case Priority Levels
export const CASE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const CASE_PRIORITY_LABELS = {
  [CASE_PRIORITY.LOW]: 'Low Priority',
  [CASE_PRIORITY.MEDIUM]: 'Medium Priority', 
  [CASE_PRIORITY.HIGH]: 'High Priority',
  [CASE_PRIORITY.URGENT]: 'Urgent',
} as const;

// Placement Types
export const PLACEMENT_TYPES = {
  FOSTER_CARE: 'foster_care',
  RELATIVE: 'relative',
  GROUP_HOME: 'group_home',
  RESIDENTIAL: 'residential',
  INDEPENDENT: 'independent',
  HOSPITAL: 'hospital',
  DETENTION: 'detention',
  HOME_PARENTS: 'home_parents',
  OTHER: 'other',
} as const;

export const PLACEMENT_TYPE_LABELS = {
  [PLACEMENT_TYPES.FOSTER_CARE]: 'Foster Care',
  [PLACEMENT_TYPES.RELATIVE]: 'Relative/Kinship Care',
  [PLACEMENT_TYPES.GROUP_HOME]: 'Group Home',
  [PLACEMENT_TYPES.RESIDENTIAL]: 'Residential Treatment',
  [PLACEMENT_TYPES.INDEPENDENT]: 'Independent Living',
  [PLACEMENT_TYPES.HOSPITAL]: 'Hospital',
  [PLACEMENT_TYPES.DETENTION]: 'Juvenile Detention',
  [PLACEMENT_TYPES.HOME_PARENTS]: 'With Parents',
  [PLACEMENT_TYPES.OTHER]: 'Other',
} as const;

// Case Statuses
export const CASE_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  PENDING: 'pending',
  REVIEW: 'review',
  TRANSFERRED: 'transferred',
} as const;

export const CASE_STATUS_LABELS = {
  [CASE_STATUS.ACTIVE]: 'Active',
  [CASE_STATUS.CLOSED]: 'Closed',
  [CASE_STATUS.PENDING]: 'Pending Assignment',
  [CASE_STATUS.REVIEW]: 'Under Review',
  [CASE_STATUS.TRANSFERRED]: 'Transferred',
} as const;

// Volunteer Statuses
export const VOLUNTEER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRAINING: 'training',
  BACKGROUND_CHECK: 'background_check',
  SUSPENDED: 'suspended',
} as const;

export const VOLUNTEER_STATUS_LABELS = {
  [VOLUNTEER_STATUS.ACTIVE]: 'Active',
  [VOLUNTEER_STATUS.INACTIVE]: 'Inactive',
  [VOLUNTEER_STATUS.TRAINING]: 'In Training',
  [VOLUNTEER_STATUS.BACKGROUND_CHECK]: 'Background Check Pending',
  [VOLUNTEER_STATUS.SUSPENDED]: 'Suspended',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'administrator',
  SUPERVISOR: 'supervisor',
  COORDINATOR: 'coordinator',
  VOLUNTEER: 'volunteer',
  VIEWER: 'viewer',
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  FULL: 'EEEE, MMMM dd, yyyy',
  SHORT: 'MM/dd/yyyy',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    DOCUMENTS: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    SPREADSHEETS: ['xls', 'xlsx', 'csv'],
    ARCHIVES: ['zip', 'rar', '7z'],
  },
} as const;

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-\(\)\.]{10,}$/,
  URL_REGEX: /^https?:\/\/.+/,
  SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 8,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  CASES: '/wp-json/casa/v1/cases',
  VOLUNTEERS: '/wp-json/casa/v1/volunteers',
  REPORTS: '/wp-json/casa/v1/reports',
  COURT_HEARINGS: '/wp-json/casa/v1/court-hearings',
  UPLOADS: '/wp-json/casa/v1/uploads',
  DASHBOARD_STATS: '/wp-json/casa/v1/dashboard-stats',
} as const;

// Activity Types
export const ACTIVITY_TYPES = {
  CASE_CREATED: 'case_created',
  CASE_UPDATED: 'case_updated',
  VOLUNTEER_ASSIGNED: 'volunteer_assigned',
  HOME_VISIT: 'home_visit',
  COURT_HEARING: 'court_hearing',
  REPORT_SUBMITTED: 'report_submitted',
  DOCUMENT_UPLOADED: 'document_uploaded',
} as const;

export const ACTIVITY_TYPE_LABELS = {
  [ACTIVITY_TYPES.CASE_CREATED]: 'Case Created',
  [ACTIVITY_TYPES.CASE_UPDATED]: 'Case Updated',
  [ACTIVITY_TYPES.VOLUNTEER_ASSIGNED]: 'Volunteer Assigned',
  [ACTIVITY_TYPES.HOME_VISIT]: 'Home Visit',
  [ACTIVITY_TYPES.COURT_HEARING]: 'Court Hearing',
  [ACTIVITY_TYPES.REPORT_SUBMITTED]: 'Report Submitted',
  [ACTIVITY_TYPES.DOCUMENT_UPLOADED]: 'Document Uploaded',
} as const;

// Contact Types
export const CONTACT_TYPES = {
  PHONE: 'phone',
  EMAIL: 'email',
  IN_PERSON: 'in_person',
  VIDEO: 'video',
  TEXT: 'text',
} as const;

export const CONTACT_TYPE_LABELS = {
  [CONTACT_TYPES.PHONE]: 'Phone Call',
  [CONTACT_TYPES.EMAIL]: 'Email',
  [CONTACT_TYPES.IN_PERSON]: 'In-Person Visit',
  [CONTACT_TYPES.VIDEO]: 'Video Call',
  [CONTACT_TYPES.TEXT]: 'Text Message',
} as const;

// Report Types
export const REPORT_TYPES = {
  HOME_VISIT: 'home_visit',
  COURT_REPORT: 'court_report',
  MONTHLY: 'monthly',
  INCIDENT: 'incident',
  PROGRESS: 'progress',
} as const;

export const REPORT_TYPE_LABELS = {
  [REPORT_TYPES.HOME_VISIT]: 'Home Visit Report',
  [REPORT_TYPES.COURT_REPORT]: 'Court Report',
  [REPORT_TYPES.MONTHLY]: 'Monthly Report',
  [REPORT_TYPES.INCIDENT]: 'Incident Report',
  [REPORT_TYPES.PROGRESS]: 'Progress Report',
} as const;