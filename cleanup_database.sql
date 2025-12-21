-- CASA Database Cleanup Script
-- This script will remove all data not associated with Bartow organization
-- and clean up user meta except for specified users

-- First, let's see what organizations exist
SELECT 'Current Organizations:' as info;
SELECT id, name, slug, status FROM wp_casa_organizations;

-- Find the Bartow organization ID
SELECT 'Bartow Organization ID:' as info;
SELECT id, name, slug FROM wp_casa_organizations WHERE slug = 'bartow';

-- Find the specified users
SELECT 'Target Users:' as info;
SELECT ID, user_email, display_name FROM wp_users WHERE user_email IN ('walterjonesjr@gmail.com', 'walter@narcrms.net');

-- Clean up casa_organizations - keep only Bartow
DELETE FROM wp_casa_organizations WHERE slug != 'bartow';

-- Clean up casa_user_organizations - keep only Bartow associations
DELETE uo FROM wp_casa_user_organizations uo
LEFT JOIN wp_casa_organizations o ON uo.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up casa_volunteers - keep only Bartow volunteers
DELETE v FROM wp_casa_volunteers v
LEFT JOIN wp_casa_organizations o ON v.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up casa_cases - keep only Bartow cases
DELETE c FROM wp_casa_cases c
LEFT JOIN wp_casa_organizations o ON c.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up casa_contact_logs - keep only Bartow contact logs
DELETE cl FROM wp_casa_contact_logs cl
LEFT JOIN wp_casa_cases c ON cl.case_id = c.id
LEFT JOIN wp_casa_organizations o ON c.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up casa_court_hearings - keep only Bartow court hearings
DELETE ch FROM wp_casa_court_hearings ch
LEFT JOIN wp_casa_cases c ON ch.case_id = c.id
LEFT JOIN wp_casa_organizations o ON c.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up casa_documents - keep only Bartow documents
DELETE d FROM wp_casa_documents d
LEFT JOIN wp_casa_cases c ON d.case_id = c.id
LEFT JOIN wp_casa_organizations o ON c.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up casa_reports - keep only Bartow reports
DELETE r FROM wp_casa_reports r
LEFT JOIN wp_casa_cases c ON r.case_id = c.id
LEFT JOIN wp_casa_organizations o ON c.organization_id = o.id
WHERE o.slug != 'bartow' OR o.id IS NULL;

-- Clean up WordPress users - keep only specified users
DELETE FROM wp_users WHERE user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net');

-- Clean up user meta - keep only for specified users
DELETE um FROM wp_usermeta um
LEFT JOIN wp_users u ON um.user_id = u.ID
WHERE u.user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net');

-- Clean up casa_profiles - keep only for specified users
DELETE cp FROM wp_casa_profiles cp
LEFT JOIN wp_users u ON cp.user_id = u.ID
WHERE u.user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net');

-- Show final state
SELECT 'Final Organizations:' as info;
SELECT id, name, slug, status FROM wp_casa_organizations;

SELECT 'Final Users:' as info;
SELECT ID, user_email, display_name FROM wp_users;

SELECT 'Final User Organizations:' as info;
SELECT uo.*, u.user_email, o.name as org_name 
FROM wp_casa_user_organizations uo
JOIN wp_users u ON uo.user_id = u.ID
JOIN wp_casa_organizations o ON uo.organization_id = o.id; 