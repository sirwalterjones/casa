// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  organizationId: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  organizationSlug?: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationSlug?: string;
  role?: string;
}

// Organization Types
export interface CasaOrganization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  allowVolunteerSelfRegistration: boolean;
  requireBackgroundCheck: boolean;
  maxCasesPerVolunteer: number;
}

// Tenant Types (legacy compatibility)
export interface Tenant extends CasaOrganization {}
export interface TenantSettings extends OrganizationSettings {}

// Volunteer Types
export interface Volunteer {
  id: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Address;
  dateOfBirth?: string;
  emergencyContact?: EmergencyContact;
  backgroundCheckStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  backgroundCheckDate?: string;
  trainingStatus: 'not_started' | 'in_progress' | 'completed' | 'expired';
  trainingCompletedDate?: string;
  volunteerStatus: 'applied' | 'background_check' | 'training' | 'active' | 'inactive' | 'rejected' | 'suspended';
  isActive: boolean;
  specialties?: string[];
  availability?: string[];
  preferredCaseTypes?: string[];
  organizationId: string;
  assignedCases?: string[];
  // Pipeline tracking fields
  applicationDate?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Volunteer Application (public submission - no user account yet)
export interface VolunteerApplicationData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  // Background Information
  employer?: string;
  occupation?: string;
  educationLevel?: string;
  languagesSpoken?: string;
  previousVolunteerExperience?: string;

  // Availability
  preferredSchedule?: string;
  maxCases: number;
  availabilityNotes?: string;

  // References
  reference1Name: string;
  reference1Phone: string;
  reference1Relationship: string;
  reference2Name: string;
  reference2Phone: string;
  reference2Relationship: string;

  // Preferences
  agePreference?: string;
  genderPreference?: string;
  specialNeedsExperience?: boolean;
  transportationAvailable?: boolean;

  // Legal agreements
  backgroundCheckConsent: boolean;
  liabilityWaiver: boolean;
  confidentialityAgreement: boolean;
}

// Organization public info (for application form)
export interface OrganizationPublicInfo {
  id: string;
  name: string;
  slug: string;
}

// Pipeline action request
export interface PipelineActionRequest {
  action: 'start_background_check' | 'approve_background_check' | 'fail_background_check' | 'complete_training' | 'approve_volunteer' | 'reject_application';
  notes?: string;
  rejectionReason?: string;
}

// Application submission response
export interface ApplicationSubmissionResponse {
  success: boolean;
  referenceNumber: string;
  message: string;
}

// Case Types
export interface CasaCase {
  id: string;
  caseNumber: string;
  children: Child[];
  assignedVolunteerId?: string;
  assignedVolunteer?: Volunteer;
  status: 'open' | 'closed' | 'pending' | 'transferred';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  courtInfo: CourtInfo;
  placementInfo: PlacementInfo;
  caseGoals: CaseGoal[];
  nextCourtDate?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  ethnicity?: string;
  specialNeeds?: string[];
  medicalInfo?: string;
  schoolInfo?: SchoolInfo;
  currentPlacement: PlacementInfo;
  placementHistory: PlacementInfo[];
}

export interface CourtInfo {
  judge: string;
  courtroom?: string;
  caseworker: string;
  attorney?: string;
  guardianAdLitem?: string;
  nextHearingDate?: string;
  nextHearingType?: string;
}

export interface PlacementInfo {
  type: 'foster_home' | 'kinship' | 'group_home' | 'residential' | 'family_home';
  caregiverName: string;
  caregiverPhone?: string;
  address: Address;
  placementDate: string;
  isCurrentPlacement: boolean;
}

export interface CaseGoal {
  id: string;
  description: string;
  targetDate?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  notes?: string;
}

export interface SchoolInfo {
  schoolName: string;
  grade: string;
  teacher?: string;
  specialEducation?: boolean;
  notes?: string;
}

// Contact Log Types
export interface ContactLog {
  id: string;
  caseId: string;
  volunteerId: string;
  contactType: 'home_visit' | 'phone_call' | 'email' | 'court_hearing' | 'school_visit' | 'other';
  contactDate: string;
  duration?: number; // in minutes
  participants: string[];
  location?: string;
  summary: string;
  concerns?: string;
  followUpNeeded: boolean;
  followUpDate?: string;
  attachments?: CaseDocument[];
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// Document Types
export interface CaseDocument {
  id: string;
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: string;
  documentType: 'court_order' | 'report' | 'photo' | 'medical' | 'school' | 'other';
  isConfidential: boolean;
  description?: string;
  fileUrl: string;
  organizationId: string;
}

// Form Types
export interface FormSchema {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'email' | 'phone';
  label: string;
  name: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: ValidationRule[];
  defaultValue?: any;
}

export interface FormSettings {
  allowMultipleSubmissions: boolean;
  requireAuthentication: boolean;
  confirmationMessage?: string;
  redirectUrl?: string;
  emailNotifications?: EmailNotification[];
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'min_length' | 'max_length' | 'pattern';
  value?: any;
  message: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  submittedBy?: string;
  submissionData: Record<string, any>;
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'submitted' | 'processed' | 'archived';
  organizationId: string;
}

// Common Types
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// Dashboard Types
export interface DashboardStats {
  activeCases: number;
  volunteers: number;
  pendingReviews: number;
  courtHearings: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  date: string;
  type: string;
  description: string;
}

// File Upload Types
export interface FileUploadProgress {
  progress: number;
  file: File;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  organization: CasaOrganization | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  switchOrganization: (organizationId: string) => Promise<void>;
  isAuthenticated: boolean;
}

// Navigation Types
export interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ComponentType<any>;
  current?: boolean;
  children?: NavigationItem[];
}

// Table Types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// Filter Types
export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SearchFilters {
  query?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  [key: string]: any;
}

// API Response Types
export interface WordPressJWTResponse {
  token: string;
  user_email: string;
  user_nicename: string;
  user_display_name: string;
}

export interface CasesAPIResponse {
  cases: CasaCase[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface AuthLoginResponse {
  user: User;
  organization: CasaOrganization;
  token: string;
}

export interface TokenRefreshResponse {
  token: string;
  user: User;
}

export interface OrganizationSwitchResponse {
  organization: CasaOrganization;
}

export interface ProfileUpdateResponse {
  user: User;
}

export interface PasswordResetResponse {
  message: string;
}

export interface ContactLogsAPIResponse {
  contacts: ContactLog[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface DocumentsAPIResponse {
  documents: CaseDocument[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}