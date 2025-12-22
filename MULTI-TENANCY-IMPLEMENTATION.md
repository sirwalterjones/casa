# CASA Multi-Tenancy Implementation - Context Document

## Current Status: Super Admin UI Build (In Progress)

### Completed
1. **Multi-tenancy backend** (`wordpress-backend/plugins/casa-enhanced/multi-tenancy.php`)
   - Super admin role (`casa_super_admin`)
   - `casa_is_super_admin()` - check if user is super admin
   - `casa_get_organization_filter()` - returns org ID or NULL for super admins
   - `casa_can_access_organization()` - check org access
   - `casa_build_org_where_clause()` - SQL helper for org filtering
   - Audit logging functions
   - Security event logging

2. **Updated data endpoints** with organization filtering:
   - `casa_get_cases()` - cases filtered by org
   - `casa_get_volunteers()` - volunteers filtered by org
   - `casa_get_contact_logs()` - contact logs filtered by org
   - `casa_get_home_visit_reports()` - reports filtered by org

3. **Super Admin API Endpoints**:
   - `POST /casa/v1/super-admin/setup` - create super admin user
   - `POST /casa/v1/super-admin/full-setup` - create super admin + test org
   - `GET /casa/v1/super-admin/dashboard` - super admin dashboard
   - `POST /casa/v1/super-admin/organizations` - create organization
   - `GET /casa/v1/super-admin/organizations` - list all organizations
   - `GET /casa/v1/super-admin/organizations/{id}/users` - get org users
   - `POST /casa/v1/super-admin/assign-user` - assign user to org
   - `GET /casa/v1/super-admin/security-log` - view security events
   - `GET /casa/v1/super-admin/access-log` - view data access log

4. **Frontend Service** (`src/services/superAdminService.ts`)
   - API wrapper for all super admin endpoints

5. **Frontend Pages Created**:
   - `/src/pages/super-admin/index.tsx` - Dashboard with org overview
   - `/src/pages/super-admin/organizations.tsx` - Org management + create modal

### In Progress
- User management page (`/src/pages/super-admin/users.tsx`)
- Fixing WordPress critical error in multi-tenancy.php

### Data Structure

```
wp_casa_organizations
├── id, name, slug, domain, status
├── contact_email, phone, address
├── settings (JSON)
└── created_at, updated_at

wp_casa_user_organizations (User ↔ Org mapping)
├── user_id → wp_users.ID
├── organization_id → wp_casa_organizations.id
├── casa_role (admin|supervisor|volunteer)
└── status, background_check_status, training_status

wp_casa_cases
├── organization_id ← TENANT KEY
├── case_number, assigned_volunteer_id
├── child_first_name, child_last_name, child_dob
└── status, priority, case_type, etc.

wp_casa_volunteers
├── organization_id ← TENANT KEY
├── user_id (optional WordPress user link)
├── first_name, last_name, email
└── volunteer_status, background_check_status, etc.
```

### Current Setup
- **Super Admin**: walter@joneswebdesigns.com (user_id: 1)
- **Test Org**: Bartow County CASA (id: 2, slug: bartow-casa)
- **Backend**: https://casa-backend-241015914634.us-east4.run.app
- **Frontend**: https://casa-frontend-241015914634.us-east4.run.app

### Safeguards Implemented
1. `casa_validate_record_ownership()` - validates record belongs to user's org before mutations
2. `casa_log_data_access()` - logs all cross-org data access
3. `casa_log_security_event()` - logs security events (attempted violations)
4. `casa_safe_query()` - wrapper that ensures org filter is applied to queries

### Files Modified
- `wordpress-backend/plugins/casa-enhanced/casa-enhanced.php` - added multi-tenancy.php include
- `wordpress-backend/plugins/casa-enhanced/multi-tenancy.php` - NEW: all multi-tenancy logic
- `src/services/superAdminService.ts` - NEW: frontend API service
- `src/pages/super-admin/index.tsx` - NEW: dashboard page
- `src/pages/super-admin/organizations.tsx` - NEW: org management page

### Next Steps
1. Fix WordPress critical error
2. Create users management page
3. Deploy updated backend to GCP
4. Test super admin UI end-to-end
