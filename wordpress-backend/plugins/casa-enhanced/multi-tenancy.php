<?php
/**
 * CASA Multi-Tenancy & Super Admin Module
 *
 * Provides:
 * - Super admin role with cross-organization access
 * - Tenant data isolation
 * - Organization context management
 *
 * Version: 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Super admin email - this user has access to ALL organizations
define('CASA_SUPER_ADMIN_EMAIL', 'walter@joneswebdesigns.com');

/**
 * Add super admin role on plugin activation
 */
function casa_add_super_admin_role() {
    // Remove existing role to update capabilities
    remove_role('casa_super_admin');

    // CASA Super Admin - Full system access across ALL organizations
    add_role('casa_super_admin', 'CASA Super Admin', array(
        'read' => true,
        'edit_posts' => true,
        'edit_others_posts' => true,
        'publish_posts' => true,
        'manage_categories' => true,
        'edit_users' => true,
        'list_users' => true,
        'create_users' => true,
        'delete_users' => true,
        'remove_users' => true,
        'promote_users' => true,
        'edit_theme_options' => true,
        'moderate_comments' => true,
        'manage_options' => true,
        // CASA-specific capabilities
        'casa_super_admin' => true,
        'casa_manage_all_organizations' => true,
        'casa_view_all_organizations' => true,
        'casa_manage_organization' => true,
        'casa_manage_all_cases' => true,
        'casa_manage_volunteers' => true,
        'casa_view_reports' => true,
        'casa_view_all_reports' => true,
        'casa_export_data' => true,
        'casa_manage_settings' => true,
        'casa_view_audit_logs' => true,
    ));
}
add_action('init', 'casa_add_super_admin_role', 5);

/**
 * Check if a user is a super admin
 *
 * @param int|null $user_id User ID to check (defaults to current user)
 * @return bool True if user is super admin
 */
function casa_is_super_admin($user_id = null) {
    if ($user_id === null) {
        $user_id = get_current_user_id();
    }

    if (!$user_id) {
        return false;
    }

    $user = get_userdata($user_id);
    if (!$user) {
        return false;
    }

    // Check if user has super_admin role
    if (in_array('casa_super_admin', (array) $user->roles)) {
        return true;
    }

    // Check if user has super_admin capability
    if (user_can($user_id, 'casa_super_admin')) {
        return true;
    }

    // Check if user email matches super admin email
    if ($user->user_email === CASA_SUPER_ADMIN_EMAIL) {
        return true;
    }

    return false;
}

/**
 * Get the organization ID filter for queries
 * Returns NULL for super admins (no filter), or the user's org ID
 *
 * @param int|null $user_id User ID (defaults to current user)
 * @param int|null $requested_org_id Optional specific org ID requested
 * @return int|null Organization ID to filter by, or NULL for all orgs
 */
function casa_get_organization_filter($user_id = null, $requested_org_id = null) {
    if ($user_id === null) {
        $user_id = get_current_user_id();
    }

    // Super admins can access all organizations
    if (casa_is_super_admin($user_id)) {
        // If super admin requests a specific org, use that
        if ($requested_org_id !== null) {
            return intval($requested_org_id);
        }
        // Return NULL to indicate no filter (all organizations)
        return null;
    }

    // Regular users: get their organization
    global $wpdb;
    $table = $wpdb->prefix . 'casa_user_organizations';

    $org_id = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $user_id
    ));

    return $org_id ? intval($org_id) : 0;
}

/**
 * Check if user can access a specific organization
 *
 * @param int $organization_id Organization ID to check
 * @param int|null $user_id User ID (defaults to current user)
 * @return bool True if user can access the organization
 */
function casa_can_access_organization($organization_id, $user_id = null) {
    if ($user_id === null) {
        $user_id = get_current_user_id();
    }

    // Super admins can access all organizations
    if (casa_is_super_admin($user_id)) {
        return true;
    }

    // Check if user belongs to this organization
    global $wpdb;
    $table = $wpdb->prefix . 'casa_user_organizations';

    $exists = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table WHERE user_id = %d AND organization_id = %d AND status = 'active'",
        $user_id,
        $organization_id
    ));

    return $exists > 0;
}

/**
 * Get all organizations (for super admin)
 *
 * @return array List of all organizations
 */
function casa_get_all_organizations() {
    global $wpdb;
    $table = $wpdb->prefix . 'casa_organizations';

    return $wpdb->get_results("SELECT * FROM $table ORDER BY name ASC", ARRAY_A);
}

/**
 * Create or update super admin user
 *
 * @return array Result with success status and message
 */
function casa_setup_super_admin() {
    $email = CASA_SUPER_ADMIN_EMAIL;

    // Check if user already exists
    $existing_user = get_user_by('email', $email);

    if ($existing_user) {
        // Add super admin role to existing user
        $user = new WP_User($existing_user->ID);
        $user->add_role('casa_super_admin');
        $user->add_role('administrator');

        // Ensure capabilities are set
        $user->add_cap('casa_super_admin');
        $user->add_cap('casa_manage_all_organizations');

        return array(
            'success' => true,
            'message' => 'Super admin role added to existing user: ' . $email,
            'user_id' => $existing_user->ID
        );
    }

    // Create new super admin user
    $password = wp_generate_password(16, true, true);

    $user_id = wp_create_user('super_admin', $password, $email);

    if (is_wp_error($user_id)) {
        return array(
            'success' => false,
            'message' => 'Failed to create super admin: ' . $user_id->get_error_message()
        );
    }

    // Set user details
    wp_update_user(array(
        'ID' => $user_id,
        'first_name' => 'Walter',
        'last_name' => 'Jones',
        'display_name' => 'Walter Jones (Super Admin)',
        'nickname' => 'Super Admin'
    ));

    // Add roles
    $user = new WP_User($user_id);
    $user->set_role('casa_super_admin');
    $user->add_role('administrator');

    // Add capabilities
    $user->add_cap('casa_super_admin');
    $user->add_cap('casa_manage_all_organizations');

    return array(
        'success' => true,
        'message' => 'Super admin created successfully',
        'user_id' => $user_id,
        'email' => $email,
        'password' => $password // Only returned on creation
    );
}

/**
 * Build SQL WHERE clause for organization filtering
 *
 * @param string $org_column Column name for organization_id (e.g., 'c.organization_id')
 * @param int|null $org_filter Organization filter from casa_get_organization_filter()
 * @param array &$params Reference to params array to add prepared values
 * @return string WHERE clause fragment (without 'WHERE' keyword)
 */
function casa_build_org_where_clause($org_column, $org_filter, &$params) {
    if ($org_filter === null) {
        // Super admin - no organization filter
        return '1=1';
    }

    $params[] = $org_filter;
    return "$org_column = %d";
}

/**
 * REST API endpoint: Get super admin dashboard
 */
function casa_super_admin_dashboard($request) {
    if (!casa_is_super_admin()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admin access required'
        ), 403);
    }

    global $wpdb;

    // Get all organizations with stats
    $orgs = casa_get_all_organizations();

    $org_stats = array();
    foreach ($orgs as $org) {
        $org_id = $org['id'];

        $cases_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}casa_cases WHERE organization_id = %d",
            $org_id
        ));

        $volunteers_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}casa_volunteers WHERE organization_id = %d",
            $org_id
        ));

        $users_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}casa_user_organizations WHERE organization_id = %d AND status = 'active'",
            $org_id
        ));

        $org_stats[] = array_merge($org, array(
            'cases_count' => intval($cases_count),
            'volunteers_count' => intval($volunteers_count),
            'users_count' => intval($users_count)
        ));
    }

    // Get global stats
    $total_cases = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}casa_cases");
    $total_volunteers = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}casa_volunteers");
    $total_users = $wpdb->get_var("SELECT COUNT(DISTINCT user_id) FROM {$wpdb->prefix}casa_user_organizations WHERE status = 'active'");

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'organizations' => $org_stats,
            'totals' => array(
                'organizations' => count($orgs),
                'cases' => intval($total_cases),
                'volunteers' => intval($total_volunteers),
                'users' => intval($total_users)
            ),
            'is_super_admin' => true
        )
    ), 200);
}

/**
 * REST API endpoint: Setup super admin
 */
function casa_api_setup_super_admin($request) {
    // Only allow if no super admin exists yet, or if current user is admin
    $existing_super = get_user_by('email', CASA_SUPER_ADMIN_EMAIL);

    if ($existing_super && !current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admin already exists'
        ), 403);
    }

    $result = casa_setup_super_admin();

    return new WP_REST_Response($result, $result['success'] ? 200 : 500);
}

/**
 * REST API endpoint: Full setup (super admin + test organization)
 */
function casa_api_full_setup($request) {
    $results = array(
        'super_admin' => null,
        'organization' => null,
        'user_org_assignment' => null
    );

    // Step 1: Setup super admin
    $admin_result = casa_setup_super_admin();
    $results['super_admin'] = $admin_result;

    // Step 2: Create test organization if it doesn't exist
    global $wpdb;
    $table = $wpdb->prefix . 'casa_organizations';

    $existing_org = $wpdb->get_row("SELECT * FROM $table WHERE slug = 'bartow-casa' LIMIT 1", ARRAY_A);

    if (!$existing_org) {
        $org_result = $wpdb->insert($table, array(
            'name' => 'Bartow County CASA',
            'slug' => 'bartow-casa',
            'contact_email' => 'info@bartowcasa.org',
            'phone' => '(770) 555-0100',
            'address' => '123 Main Street, Cartersville, GA 30120',
            'status' => 'active',
            'settings' => json_encode(array(
                'allowVolunteerSelfRegistration' => true,
                'requireBackgroundCheck' => true,
                'maxCasesPerVolunteer' => 5
            ))
        ), array('%s', '%s', '%s', '%s', '%s', '%s', '%s'));

        if ($org_result === false) {
            $results['organization'] = array(
                'success' => false,
                'message' => 'Failed to create organization: ' . $wpdb->last_error
            );
        } else {
            $org_id = $wpdb->insert_id;
            $results['organization'] = array(
                'success' => true,
                'message' => 'Organization created successfully',
                'id' => $org_id,
                'name' => 'Bartow County CASA',
                'slug' => 'bartow-casa'
            );

            // Step 3: Assign super admin to organization
            if ($admin_result['success'] && isset($admin_result['user_id'])) {
                $user_org_table = $wpdb->prefix . 'casa_user_organizations';

                // Check if assignment already exists
                $existing_assignment = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM $user_org_table WHERE user_id = %d AND organization_id = %d",
                    $admin_result['user_id'],
                    $org_id
                ));

                if (!$existing_assignment) {
                    $assign_result = $wpdb->insert($user_org_table, array(
                        'user_id' => $admin_result['user_id'],
                        'organization_id' => $org_id,
                        'casa_role' => 'admin',
                        'status' => 'active'
                    ), array('%d', '%d', '%s', '%s'));

                    $results['user_org_assignment'] = array(
                        'success' => $assign_result !== false,
                        'message' => $assign_result !== false ? 'User assigned to organization' : 'Failed to assign user'
                    );
                } else {
                    $results['user_org_assignment'] = array(
                        'success' => true,
                        'message' => 'User already assigned to organization'
                    );
                }
            }
        }
    } else {
        $results['organization'] = array(
            'success' => true,
            'message' => 'Organization already exists',
            'id' => $existing_org['id'],
            'name' => $existing_org['name'],
            'slug' => $existing_org['slug']
        );

        // Still try to assign super admin to existing org
        if ($admin_result['success'] && isset($admin_result['user_id'])) {
            $user_org_table = $wpdb->prefix . 'casa_user_organizations';

            $existing_assignment = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM $user_org_table WHERE user_id = %d AND organization_id = %d",
                $admin_result['user_id'],
                $existing_org['id']
            ));

            if (!$existing_assignment) {
                $assign_result = $wpdb->insert($user_org_table, array(
                    'user_id' => $admin_result['user_id'],
                    'organization_id' => $existing_org['id'],
                    'casa_role' => 'admin',
                    'status' => 'active'
                ), array('%d', '%d', '%s', '%s'));

                $results['user_org_assignment'] = array(
                    'success' => $assign_result !== false,
                    'message' => $assign_result !== false ? 'User assigned to organization' : 'Failed to assign user'
                );
            } else {
                $results['user_org_assignment'] = array(
                    'success' => true,
                    'message' => 'User already assigned to organization'
                );
            }
        }
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Full setup completed',
        'data' => $results
    ), 200);
}

/**
 * REST API endpoint: Create organization
 */
function casa_api_create_organization($request) {
    if (!casa_is_super_admin()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admin access required'
        ), 403);
    }

    $params = $request->get_json_params();

    $name = sanitize_text_field($params['name'] ?? '');
    $slug = sanitize_title($params['slug'] ?? $name);
    $contact_email = sanitize_email($params['contact_email'] ?? '');
    $phone = sanitize_text_field($params['phone'] ?? '');
    $address = sanitize_textarea_field($params['address'] ?? '');

    if (empty($name)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Organization name is required'
        ), 400);
    }

    global $wpdb;
    $table = $wpdb->prefix . 'casa_organizations';

    // Check if slug exists
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM $table WHERE slug = %s",
        $slug
    ));

    if ($existing) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Organization slug already exists'
        ), 400);
    }

    // Insert organization
    $result = $wpdb->insert($table, array(
        'name' => $name,
        'slug' => $slug,
        'contact_email' => $contact_email,
        'phone' => $phone,
        'address' => $address,
        'status' => 'active',
        'settings' => json_encode(array(
            'allowVolunteerSelfRegistration' => true,
            'requireBackgroundCheck' => true,
            'maxCasesPerVolunteer' => 5
        ))
    ), array('%s', '%s', '%s', '%s', '%s', '%s', '%s'));

    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create organization: ' . $wpdb->last_error
        ), 500);
    }

    $org_id = $wpdb->insert_id;

    // Log organization (tenant) creation
    casa_log_audit('tenant', 'create', array(
        'organization_id' => null, // Super admin action, no org context
        'resource_type' => 'organization',
        'resource_id' => $org_id,
        'resource_identifier' => $slug,
        'new_values' => array(
            'name' => $name,
            'slug' => $slug,
            'contact_email' => $contact_email
        )
    ));

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Organization created successfully',
        'data' => array(
            'id' => $org_id,
            'name' => $name,
            'slug' => $slug
        )
    ), 201);
}

/**
 * Register multi-tenancy REST API endpoints
 */
function casa_register_multitenancy_endpoints() {
    // Super admin dashboard
    register_rest_route('casa/v1', '/super-admin/dashboard', array(
        'methods' => 'GET',
        'callback' => 'casa_super_admin_dashboard',
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Setup super admin
    register_rest_route('casa/v1', '/super-admin/setup', array(
        'methods' => 'POST',
        'callback' => 'casa_api_setup_super_admin',
        'permission_callback' => '__return_true'
    ));

    // Full setup - creates super admin + test organization (one-time setup endpoint)
    register_rest_route('casa/v1', '/super-admin/full-setup', array(
        'methods' => 'POST',
        'callback' => 'casa_api_full_setup',
        'permission_callback' => '__return_true'
    ));

    // Create organization (super admin only)
    register_rest_route('casa/v1', '/super-admin/organizations', array(
        'methods' => 'POST',
        'callback' => 'casa_api_create_organization',
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Get all organizations (super admin only)
    register_rest_route('casa/v1', '/super-admin/organizations', array(
        'methods' => 'GET',
        'callback' => function($request) {
            if (!casa_is_super_admin()) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Super admin access required'
                ), 403);
            }

            $orgs = casa_get_all_organizations();
            return new WP_REST_Response(array(
                'success' => true,
                'data' => $orgs
            ), 200);
        },
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Switch organization context (super admin only)
    register_rest_route('casa/v1', '/super-admin/switch-org/(?P<org_id>\d+)', array(
        'methods' => 'POST',
        'callback' => function($request) {
            if (!casa_is_super_admin()) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Super admin access required'
                ), 403);
            }

            $org_id = intval($request['org_id']);

            global $wpdb;
            $org = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}casa_organizations WHERE id = %d",
                $org_id
            ), ARRAY_A);

            if (!$org) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Organization not found'
                ), 404);
            }

            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Organization context switched',
                'data' => $org
            ), 200);
        },
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));
}
add_action('rest_api_init', 'casa_register_multitenancy_endpoints');

/**
 * Add organization filter to REST API requests
 * This ensures data isolation for regular users
 */
function casa_add_org_filter_to_request($request) {
    // Get organization context from header or query param
    $org_id = $request->get_header('X-Organization-ID');
    if (!$org_id) {
        $org_id = $request->get_param('organization_id');
    }

    if ($org_id && !casa_can_access_organization($org_id)) {
        // User doesn't have access to requested organization
        return new WP_Error(
            'rest_forbidden',
            'You do not have access to this organization',
            array('status' => 403)
        );
    }

    return $request;
}

/**
 * Log super admin actions for audit trail
 */
function casa_log_super_admin_action($action, $details = array()) {
    if (!casa_is_super_admin()) {
        return;
    }

    $user_id = get_current_user_id();
    $user = get_userdata($user_id);

    $log_entry = array(
        'timestamp' => current_time('mysql'),
        'user_id' => $user_id,
        'user_email' => $user ? $user->user_email : 'unknown',
        'action' => $action,
        'details' => $details,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    );

    // Store in options for now (could be moved to a dedicated table)
    $logs = get_option('casa_super_admin_audit_log', array());
    $logs[] = $log_entry;

    // Keep only last 1000 entries
    if (count($logs) > 1000) {
        $logs = array_slice($logs, -1000);
    }

    update_option('casa_super_admin_audit_log', $logs);
}

/**
 * ============================================================================
 * DATA ISOLATION SAFEGUARDS
 * ============================================================================
 * These functions ensure tenant data never crosses organization boundaries
 */

/**
 * Validate that a record belongs to the user's organization before any mutation
 * This is a CRITICAL security function - use before UPDATE/DELETE operations
 *
 * @param string $table Table name (without prefix)
 * @param int $record_id Record ID to validate
 * @param string $org_column Column name for organization_id (default: 'organization_id')
 * @return bool|WP_Error True if valid, WP_Error if access denied
 */
function casa_validate_record_ownership($table, $record_id, $org_column = 'organization_id') {
    global $wpdb;
    $full_table = $wpdb->prefix . $table;

    // Get the record's organization
    $record_org = $wpdb->get_var($wpdb->prepare(
        "SELECT $org_column FROM $full_table WHERE id = %d",
        $record_id
    ));

    if ($record_org === null) {
        return new WP_Error('not_found', 'Record not found', array('status' => 404));
    }

    // Super admins can access all
    if (casa_is_super_admin()) {
        // Log cross-org access for audit trail
        casa_log_data_access($table, $record_id, $record_org, 'super_admin_access');
        return true;
    }

    // Check if user can access this organization
    if (!casa_can_access_organization($record_org)) {
        // LOG SECURITY EVENT - Attempted cross-org access
        casa_log_security_event('cross_org_access_attempt', array(
            'table' => $table,
            'record_id' => $record_id,
            'record_org' => $record_org,
            'user_org' => casa_get_organization_filter()
        ));

        return new WP_Error(
            'access_denied',
            'You do not have permission to access this record',
            array('status' => 403)
        );
    }

    return true;
}

/**
 * Log all cross-organization data access for audit trail
 */
function casa_log_data_access($table, $record_id, $record_org, $access_type = 'read') {
    $user_id = get_current_user_id();
    $user_org = casa_get_organization_filter();

    // Only log cross-org access (same-org access is normal)
    if ($record_org == $user_org && !casa_is_super_admin()) {
        return;
    }

    $log_entry = array(
        'timestamp' => current_time('mysql'),
        'user_id' => $user_id,
        'user_org' => $user_org,
        'access_type' => $access_type,
        'table' => $table,
        'record_id' => $record_id,
        'record_org' => $record_org,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    );

    $logs = get_option('casa_data_access_log', array());
    $logs[] = $log_entry;

    // Keep last 5000 entries
    if (count($logs) > 5000) {
        $logs = array_slice($logs, -5000);
    }

    update_option('casa_data_access_log', $logs);
}

/**
 * Log security events (attempted violations, etc.)
 */
function casa_log_security_event($event_type, $details = array()) {
    $user_id = get_current_user_id();
    $user = get_userdata($user_id);

    $log_entry = array(
        'timestamp' => current_time('mysql'),
        'event_type' => $event_type,
        'user_id' => $user_id,
        'user_email' => $user ? $user->user_email : 'anonymous',
        'details' => $details,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
    );

    $logs = get_option('casa_security_log', array());
    $logs[] = $log_entry;

    // Keep last 1000 security events
    if (count($logs) > 1000) {
        $logs = array_slice($logs, -1000);
    }

    update_option('casa_security_log', $logs);

    // For critical events, also log to error_log
    if (in_array($event_type, ['cross_org_access_attempt', 'unauthorized_mutation', 'sql_injection_attempt'])) {
        error_log("CASA SECURITY: $event_type - " . json_encode($details));
    }
}

/**
 * Get client IP address, handling proxies and load balancers
 *
 * @return string The client IP address
 */
function casa_get_client_ip() {
    $ip_keys = array(
        'HTTP_CF_CONNECTING_IP',  // Cloudflare
        'HTTP_X_FORWARDED_FOR',   // Load balancer/proxy
        'HTTP_X_REAL_IP',         // Nginx proxy
        'REMOTE_ADDR'             // Direct connection
    );

    foreach ($ip_keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = $_SERVER[$key];
            // Handle comma-separated IPs (X-Forwarded-For can have multiple)
            if (strpos($ip, ',') !== false) {
                $ips = explode(',', $ip);
                $ip = trim($ips[0]);
            }
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }

    return '0.0.0.0';
}

/**
 * Get the user's role within their organization
 *
 * @param int|null $user_id User ID (defaults to current user)
 * @return string The user's CASA role
 */
function casa_get_user_role($user_id = null) {
    global $wpdb;

    if ($user_id === null) {
        $user_id = get_current_user_id();
    }

    if (!$user_id) {
        return 'anonymous';
    }

    // Check if super admin first
    if (casa_is_super_admin($user_id)) {
        return 'super_admin';
    }

    $org_id = casa_get_organization_filter($user_id);
    if (!$org_id) {
        return 'unknown';
    }

    $role = $wpdb->get_var($wpdb->prepare(
        "SELECT casa_role FROM {$wpdb->prefix}casa_user_organizations WHERE user_id = %d AND organization_id = %d",
        $user_id, $org_id
    ));

    return $role ?: 'unknown';
}

/**
 * Log an audit event to the database
 *
 * Comprehensive audit logging for all system actions.
 *
 * @param string $action_type Category of action (auth, case, volunteer, document, etc.)
 * @param string $action Specific action (create, update, delete, login_success, etc.)
 * @param array $options Additional options:
 *   - organization_id: Override the organization (defaults to user's org)
 *   - user_id: Override the user (defaults to current user)
 *   - user_email: Override email (used for failed logins)
 *   - user_role: Override role
 *   - resource_type: Type of resource being acted upon
 *   - resource_id: ID of the resource
 *   - resource_identifier: Human-readable identifier (case number, email, etc.)
 *   - old_values: Previous values (for updates/deletes)
 *   - new_values: New values (for creates/updates)
 *   - metadata: Additional context
 *   - status: success, failure, or denied
 *   - severity: info, warning, or critical
 *
 * @return int|false Insert ID on success, false on failure
 */
function casa_log_audit($action_type, $action, $options = array()) {
    global $wpdb;

    // Check if audit table exists - fail silently if not
    $table_name = $wpdb->prefix . 'casa_audit_logs';
    $table_exists = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
        DB_NAME,
        $table_name
    ));

    if (!$table_exists) {
        // Table doesn't exist yet - try to create it
        casa_ensure_audit_table_exists();

        // Check again after creation attempt
        $table_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
            DB_NAME,
            $table_name
        ));

        if (!$table_exists) {
            // Still doesn't exist - log to error_log and return silently
            error_log("CASA AUDIT: Table {$table_name} does not exist - audit log skipped for {$action_type}/{$action}");
            return false;
        }
    }

    $user_id = isset($options['user_id']) ? intval($options['user_id']) : get_current_user_id();
    $user = $user_id ? get_userdata($user_id) : null;

    // Get organization ID - use provided, or user's org, or null for super admin actions
    $org_id = null;
    if (isset($options['organization_id'])) {
        $org_id = $options['organization_id'] ? intval($options['organization_id']) : null;
    } else {
        $org_id = casa_get_organization_filter($user_id);
    }

    $data = array(
        'organization_id' => $org_id,
        'user_id' => $user_id,
        'user_email' => $user ? $user->user_email : ($options['user_email'] ?? 'anonymous'),
        'user_role' => $options['user_role'] ?? casa_get_user_role($user_id),
        'action_type' => sanitize_text_field($action_type),
        'action' => sanitize_text_field($action),
        'resource_type' => isset($options['resource_type']) ? sanitize_text_field($options['resource_type']) : null,
        'resource_id' => isset($options['resource_id']) ? intval($options['resource_id']) : null,
        'resource_identifier' => isset($options['resource_identifier']) ? sanitize_text_field($options['resource_identifier']) : null,
        'old_values' => isset($options['old_values']) ? wp_json_encode($options['old_values']) : null,
        'new_values' => isset($options['new_values']) ? wp_json_encode($options['new_values']) : null,
        'metadata' => isset($options['metadata']) ? wp_json_encode($options['metadata']) : null,
        'ip_address' => casa_get_client_ip(),
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 500) : null,
        'request_uri' => isset($_SERVER['REQUEST_URI']) ? substr($_SERVER['REQUEST_URI'], 0, 500) : null,
        'status' => $options['status'] ?? 'success',
        'severity' => $options['severity'] ?? 'info',
    );

    $result = $wpdb->insert($table_name, $data);

    // For critical events, also log to error_log for immediate visibility
    if ($data['severity'] === 'critical') {
        error_log("CASA AUDIT CRITICAL: {$action_type}/{$action} - User: {$data['user_email']} - " . wp_json_encode($options['metadata'] ?? []));
    }

    return $result ? $wpdb->insert_id : false;
}

/**
 * Ensure the audit logs table exists - create if it doesn't
 */
function casa_ensure_audit_table_exists() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'casa_audit_logs';
    $charset_collate = $wpdb->get_charset_collate();

    // Use direct SQL query instead of dbDelta for CREATE TABLE IF NOT EXISTS
    $sql = "CREATE TABLE IF NOT EXISTS `$table_name` (
        `id` bigint(20) NOT NULL AUTO_INCREMENT,
        `organization_id` bigint(20) NULL,
        `user_id` bigint(20) NOT NULL,
        `user_email` varchar(255) NOT NULL,
        `user_role` varchar(50) NOT NULL,
        `action_type` varchar(50) NOT NULL,
        `action` varchar(100) NOT NULL,
        `resource_type` varchar(50) NULL,
        `resource_id` bigint(20) NULL,
        `resource_identifier` varchar(255) NULL,
        `old_values` longtext NULL,
        `new_values` longtext NULL,
        `metadata` longtext NULL,
        `ip_address` varchar(45) NOT NULL,
        `user_agent` text NULL,
        `request_uri` varchar(500) NULL,
        `status` varchar(20) DEFAULT 'success',
        `severity` varchar(20) DEFAULT 'info',
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_org_created` (`organization_id`, `created_at`),
        KEY `idx_user_created` (`user_id`, `created_at`),
        KEY `idx_action_type` (`action_type`, `created_at`),
        KEY `idx_resource` (`resource_type`, `resource_id`),
        KEY `idx_severity` (`severity`, `created_at`)
    ) $charset_collate;";

    // Execute directly - suppress errors as this is a best-effort table creation
    $wpdb->query($sql);
}

/**
 * Wrap database queries with organization filter validation
 * Use this for SELECT queries to ensure org filtering is applied
 */
function casa_safe_query($query, $params = array()) {
    global $wpdb;

    // Ensure query contains organization filter (unless super admin)
    if (!casa_is_super_admin()) {
        $org_filter = casa_get_organization_filter();

        // Check if query already has org filter
        if (stripos($query, 'organization_id') === false) {
            casa_log_security_event('query_missing_org_filter', array(
                'query' => $query,
                'expected_org' => $org_filter
            ));

            // Don't execute query without org filter for non-super-admins
            return new WP_Error(
                'invalid_query',
                'Query must include organization filter',
                array('status' => 500)
            );
        }
    }

    // Execute query
    if (!empty($params)) {
        return $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    }

    return $wpdb->get_results($query, ARRAY_A);
}

/**
 * Get organization users with their roles (for super admin)
 */
function casa_api_get_organization_users($request) {
    if (!casa_is_super_admin()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admin access required'
        ), 403);
    }

    $org_id = $request->get_param('org_id');
    if (!$org_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Organization ID required'
        ), 400);
    }

    global $wpdb;
    $user_org_table = $wpdb->prefix . 'casa_user_organizations';

    $users = $wpdb->get_results($wpdb->prepare("
        SELECT uo.*, u.user_email, u.display_name
        FROM $user_org_table uo
        JOIN {$wpdb->users} u ON uo.user_id = u.ID
        WHERE uo.organization_id = %d
        ORDER BY uo.casa_role, u.display_name
    ", $org_id), ARRAY_A);

    casa_log_super_admin_action('view_org_users', array('org_id' => $org_id, 'user_count' => count($users)));

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $users
    ), 200);
}

/**
 * Assign user to organization (super admin only)
 */
function casa_api_assign_user_to_org($request) {
    if (!casa_is_super_admin()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admin access required'
        ), 403);
    }

    $params = $request->get_json_params();
    $user_id = intval($params['user_id'] ?? 0);
    $email = sanitize_email($params['email'] ?? '');
    $org_id = intval($params['organization_id'] ?? 0);
    $role = sanitize_text_field($params['casa_role'] ?? 'volunteer');
    $first_name = sanitize_text_field($params['first_name'] ?? '');
    $last_name = sanitize_text_field($params['last_name'] ?? '');

    // Validate inputs
    if (!$org_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Organization ID required'
        ), 400);
    }

    if (!$user_id && !$email) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User ID or email required'
        ), 400);
    }

    // Validate role
    $valid_roles = array('admin', 'supervisor', 'volunteer');
    if (!in_array($role, $valid_roles)) {
        $role = 'volunteer';
    }

    global $wpdb;
    $table = $wpdb->prefix . 'casa_user_organizations';
    $is_new_user = false;
    $username = '';

    // Get user by ID or email
    if (!$user_id && $email) {
        $user = get_user_by('email', $email);
        if ($user) {
            $user_id = $user->ID;
            $username = $user->user_login;
        }
    } else if ($user_id) {
        $user = get_user_by('ID', $user_id);
        if ($user) {
            $username = $user->user_login;
        }
    }

    // If user doesn't exist, create them
    if (!$user_id && $email) {
        $is_new_user = true;

        // Generate unique username from email
        $base_username = sanitize_user($email);
        $username = $base_username;
        $counter = 1;
        while (username_exists($username)) {
            $username = $base_username . '_' . $counter;
            $counter++;
        }

        // Create WordPress user
        $userdata = array(
            'user_login' => $username,
            'user_email' => $email,
            'first_name' => $first_name,
            'last_name' => $last_name,
            'display_name' => trim($first_name . ' ' . $last_name) ?: $email,
            'user_pass' => wp_generate_password(),
            'role' => 'casa_' . $role,
        );

        $user_id = wp_insert_user($userdata);

        if (is_wp_error($user_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to create user: ' . $user_id->get_error_message()
            ), 400);
        }

        error_log("CASA Super Admin: Created new user $email with ID $user_id");
    }

    if (!$user_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to find or create user'
        ), 400);
    }

    // Check if assignment exists
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM $table WHERE user_id = %d AND organization_id = %d",
        $user_id,
        $org_id
    ));

    if ($existing) {
        // Update existing assignment
        $result = $wpdb->update(
            $table,
            array('casa_role' => $role, 'status' => 'active'),
            array('id' => $existing),
            array('%s', '%s'),
            array('%d')
        );
    } else {
        // Create new assignment
        $result = $wpdb->insert($table, array(
            'user_id' => $user_id,
            'organization_id' => $org_id,
            'casa_role' => $role,
            'status' => 'active'
        ), array('%d', '%d', '%s', '%s'));
    }

    if ($result === false) {
        // If we created a new user but failed to associate, clean up
        if ($is_new_user) {
            wp_delete_user($user_id);
        }
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to assign user: ' . $wpdb->last_error
        ), 500);
    }

    // Send invitation email for new users
    $email_sent = false;
    if ($is_new_user && function_exists('casa_send_invitation_email')) {
        // Generate password reset key
        $reset_key = get_password_reset_key(get_user_by('ID', $user_id));

        if (!is_wp_error($reset_key)) {
            // Get organization name
            $org_table = $wpdb->prefix . 'casa_organizations';
            $org = $wpdb->get_row($wpdb->prepare(
                "SELECT name FROM $org_table WHERE id = %d",
                $org_id
            ));
            $org_name = $org ? $org->name : 'CASA';

            // Build password set URL
            $frontend_url = 'https://casa.joneswebdesigns.com';
            $set_password_url = $frontend_url . '/auth/set-password?key=' . $reset_key . '&login=' . rawurlencode($username);

            // Get current super admin's name
            $current_user = wp_get_current_user();
            $inviter_name = $current_user->display_name ?: 'CASA Administrator';

            // Send invitation email
            $email_sent = casa_send_invitation_email(
                $email,
                $first_name,
                $last_name,
                $role,
                $org_name,
                $set_password_url,
                $inviter_name
            );

            if (!$email_sent) {
                error_log("CASA Super Admin: Failed to send invitation email to $email");
            } else {
                error_log("CASA Super Admin: Sent invitation email to $email");
            }
        } else {
            error_log("CASA Super Admin: Failed to generate password reset key for $email");
        }
    }

    casa_log_super_admin_action('assign_user_to_org', array(
        'user_id' => $user_id,
        'org_id' => $org_id,
        'role' => $role,
        'was_update' => $existing ? true : false,
        'is_new_user' => $is_new_user,
        'email_sent' => $email_sent
    ));

    $message = $is_new_user
        ? ($email_sent ? 'User created and invitation email sent' : 'User created (email sending failed)')
        : ($existing ? 'User role updated' : 'User assigned to organization');

    return new WP_REST_Response(array(
        'success' => true,
        'message' => $message,
        'data' => array(
            'user_id' => $user_id,
            'is_new_user' => $is_new_user,
            'email_sent' => $email_sent
        )
    ), 200);
}

/**
 * Register additional super admin endpoints
 */
function casa_register_safeguard_endpoints() {
    // Get organization users
    register_rest_route('casa/v1', '/super-admin/organizations/(?P<org_id>\d+)/users', array(
        'methods' => 'GET',
        'callback' => 'casa_api_get_organization_users',
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Assign user to organization
    register_rest_route('casa/v1', '/super-admin/assign-user', array(
        'methods' => 'POST',
        'callback' => 'casa_api_assign_user_to_org',
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Get security log (super admin only)
    register_rest_route('casa/v1', '/super-admin/security-log', array(
        'methods' => 'GET',
        'callback' => function($request) {
            if (!casa_is_super_admin()) {
                return new WP_REST_Response(array('success' => false, 'message' => 'Access denied'), 403);
            }

            $logs = get_option('casa_security_log', array());
            $limit = intval($request->get_param('limit') ?? 100);

            return new WP_REST_Response(array(
                'success' => true,
                'data' => array_slice(array_reverse($logs), 0, $limit)
            ), 200);
        },
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Get data access log (super admin only)
    register_rest_route('casa/v1', '/super-admin/access-log', array(
        'methods' => 'GET',
        'callback' => function($request) {
            if (!casa_is_super_admin()) {
                return new WP_REST_Response(array('success' => false, 'message' => 'Access denied'), 403);
            }

            $logs = get_option('casa_data_access_log', array());
            $limit = intval($request->get_param('limit') ?? 100);

            return new WP_REST_Response(array(
                'success' => true,
                'data' => array_slice(array_reverse($logs), 0, $limit)
            ), 200);
        },
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Tenant audit logs - organization users can view their own org's logs
    register_rest_route('casa/v1', '/audit-logs', array(
        'methods' => 'GET',
        'callback' => 'casa_get_tenant_audit_logs',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));

    // Super admin audit logs - all organizations
    register_rest_route('casa/v1', '/super-admin/audit-logs', array(
        'methods' => 'GET',
        'callback' => 'casa_get_super_admin_audit_logs',
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));

    // Audit log export endpoints
    register_rest_route('casa/v1', '/audit-logs/export', array(
        'methods' => 'GET',
        'callback' => 'casa_export_tenant_audit_logs',
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));

    register_rest_route('casa/v1', '/super-admin/audit-logs/export', array(
        'methods' => 'GET',
        'callback' => 'casa_export_super_admin_audit_logs',
        'permission_callback' => function() {
            return casa_is_super_admin();
        }
    ));
}
add_action('rest_api_init', 'casa_register_safeguard_endpoints');

/**
 * Get audit logs for the current user's organization (tenant view)
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function casa_get_tenant_audit_logs($request) {
    global $wpdb;

    $user_id = get_current_user_id();

    // For super admins, try to get their organization from the user_organizations table
    // (they may be associated with an org even as super admin)
    $org_id = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM {$wpdb->prefix}casa_user_organizations
         WHERE user_id = %d AND status = 'active' ORDER BY id LIMIT 1",
        $user_id
    ));

    // If no org found and user is super admin, redirect them to use super-admin endpoint
    if (!$org_id && casa_is_super_admin($user_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admins without org association should use /super-admin/audit-logs endpoint'
        ), 400);
    }

    if (!$org_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User not associated with an organization'
        ), 403);
    }

    // Check if user has permission to view audit logs (admin or supervisor only)
    $user_role = casa_get_user_role($user_id);
    if (!in_array($user_role, array('admin', 'supervisor', 'super_admin'))) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'You do not have permission to view audit logs'
        ), 403);
    }

    $params = $request->get_params();
    $page = max(1, intval($params['page'] ?? 1));
    $per_page = min(max(1, intval($params['per_page'] ?? 50)), 100);
    $offset = ($page - 1) * $per_page;

    $where = array("organization_id = %d");
    $values = array($org_id);

    // Apply filters
    if (!empty($params['action_type'])) {
        $where[] = "action_type = %s";
        $values[] = sanitize_text_field($params['action_type']);
    }
    if (!empty($params['user_id'])) {
        $where[] = "user_id = %d";
        $values[] = intval($params['user_id']);
    }
    if (!empty($params['resource_type'])) {
        $where[] = "resource_type = %s";
        $values[] = sanitize_text_field($params['resource_type']);
    }
    if (!empty($params['date_from'])) {
        $where[] = "created_at >= %s";
        $values[] = sanitize_text_field($params['date_from']) . ' 00:00:00';
    }
    if (!empty($params['date_to'])) {
        $where[] = "created_at <= %s";
        $values[] = sanitize_text_field($params['date_to']) . ' 23:59:59';
    }
    if (!empty($params['severity'])) {
        $where[] = "severity = %s";
        $values[] = sanitize_text_field($params['severity']);
    }
    if (!empty($params['status'])) {
        $where[] = "status = %s";
        $values[] = sanitize_text_field($params['status']);
    }
    if (!empty($params['search'])) {
        $search = '%' . $wpdb->esc_like(sanitize_text_field($params['search'])) . '%';
        $where[] = "(user_email LIKE %s OR resource_identifier LIKE %s OR action LIKE %s)";
        $values[] = $search;
        $values[] = $search;
        $values[] = $search;
    }

    $where_sql = implode(' AND ', $where);
    $table = $wpdb->prefix . 'casa_audit_logs';

    // Get total count
    $count_query = $wpdb->prepare("SELECT COUNT(*) FROM $table WHERE $where_sql", ...$values);
    $total = intval($wpdb->get_var($count_query));

    // Get logs
    $values[] = $per_page;
    $values[] = $offset;
    $logs = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table WHERE $where_sql ORDER BY created_at DESC LIMIT %d OFFSET %d",
        ...$values
    ), ARRAY_A);

    // Decode JSON fields
    foreach ($logs as &$log) {
        $log['old_values'] = $log['old_values'] ? json_decode($log['old_values'], true) : null;
        $log['new_values'] = $log['new_values'] ? json_decode($log['new_values'], true) : null;
        $log['metadata'] = $log['metadata'] ? json_decode($log['metadata'], true) : null;
    }

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'logs' => $logs,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page,
            'total_pages' => ceil($total / $per_page)
        )
    ), 200);
}

/**
 * Get audit logs for all organizations (super admin view)
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function casa_get_super_admin_audit_logs($request) {
    global $wpdb;

    if (!casa_is_super_admin()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Super admin access required'
        ), 403);
    }

    $params = $request->get_params();
    $page = max(1, intval($params['page'] ?? 1));
    $per_page = min(max(1, intval($params['per_page'] ?? 50)), 100);
    $offset = ($page - 1) * $per_page;

    $where = array("1=1");
    $values = array();

    // Apply filters
    if (!empty($params['organization_id'])) {
        if ($params['organization_id'] === 'null' || $params['organization_id'] === '0') {
            $where[] = "al.organization_id IS NULL";
        } else {
            $where[] = "al.organization_id = %d";
            $values[] = intval($params['organization_id']);
        }
    }
    if (!empty($params['action_type'])) {
        $where[] = "al.action_type = %s";
        $values[] = sanitize_text_field($params['action_type']);
    }
    if (!empty($params['user_id'])) {
        $where[] = "al.user_id = %d";
        $values[] = intval($params['user_id']);
    }
    if (!empty($params['resource_type'])) {
        $where[] = "al.resource_type = %s";
        $values[] = sanitize_text_field($params['resource_type']);
    }
    if (!empty($params['date_from'])) {
        $where[] = "al.created_at >= %s";
        $values[] = sanitize_text_field($params['date_from']) . ' 00:00:00';
    }
    if (!empty($params['date_to'])) {
        $where[] = "al.created_at <= %s";
        $values[] = sanitize_text_field($params['date_to']) . ' 23:59:59';
    }
    if (!empty($params['severity'])) {
        $where[] = "al.severity = %s";
        $values[] = sanitize_text_field($params['severity']);
    }
    if (!empty($params['status'])) {
        $where[] = "al.status = %s";
        $values[] = sanitize_text_field($params['status']);
    }
    if (!empty($params['search'])) {
        $search = '%' . $wpdb->esc_like(sanitize_text_field($params['search'])) . '%';
        $where[] = "(al.user_email LIKE %s OR al.resource_identifier LIKE %s OR al.action LIKE %s OR o.name LIKE %s)";
        $values[] = $search;
        $values[] = $search;
        $values[] = $search;
        $values[] = $search;
    }

    $where_sql = implode(' AND ', $where);
    $audit_table = $wpdb->prefix . 'casa_audit_logs';
    $org_table = $wpdb->prefix . 'casa_organizations';

    // Get total count
    $count_sql = "SELECT COUNT(*) FROM $audit_table al LEFT JOIN $org_table o ON al.organization_id = o.id WHERE $where_sql";
    if (!empty($values)) {
        $total = intval($wpdb->get_var($wpdb->prepare($count_sql, ...$values)));
    } else {
        $total = intval($wpdb->get_var($count_sql));
    }

    // Get logs with organization name
    $values[] = $per_page;
    $values[] = $offset;
    $select_sql = "SELECT al.*, o.name as organization_name
                   FROM $audit_table al
                   LEFT JOIN $org_table o ON al.organization_id = o.id
                   WHERE $where_sql
                   ORDER BY al.created_at DESC
                   LIMIT %d OFFSET %d";

    $logs = $wpdb->get_results($wpdb->prepare($select_sql, ...$values), ARRAY_A);

    // Decode JSON fields
    foreach ($logs as &$log) {
        $log['old_values'] = $log['old_values'] ? json_decode($log['old_values'], true) : null;
        $log['new_values'] = $log['new_values'] ? json_decode($log['new_values'], true) : null;
        $log['metadata'] = $log['metadata'] ? json_decode($log['metadata'], true) : null;
    }

    // Log this super admin access
    casa_log_audit('security', 'view_audit_logs', array(
        'metadata' => array(
            'filters' => $params,
            'result_count' => count($logs)
        )
    ));

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'logs' => $logs,
            'total' => $total,
            'page' => $page,
            'per_page' => $per_page,
            'total_pages' => ceil($total / $per_page)
        )
    ), 200);
}

/**
 * Export tenant audit logs as CSV
 */
function casa_export_tenant_audit_logs($request) {
    global $wpdb;

    $user_id = get_current_user_id();
    $org_id = casa_get_organization_filter($user_id);

    if (!$org_id) {
        return new WP_REST_Response(array('success' => false, 'message' => 'No organization'), 403);
    }

    $user_role = casa_get_user_role($user_id);
    if (!in_array($user_role, array('admin', 'supervisor', 'super_admin'))) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Permission denied'), 403);
    }

    $params = $request->get_params();
    $where = array("organization_id = %d");
    $values = array($org_id);

    // Apply same filters as list endpoint
    if (!empty($params['action_type'])) {
        $where[] = "action_type = %s";
        $values[] = sanitize_text_field($params['action_type']);
    }
    if (!empty($params['date_from'])) {
        $where[] = "created_at >= %s";
        $values[] = sanitize_text_field($params['date_from']) . ' 00:00:00';
    }
    if (!empty($params['date_to'])) {
        $where[] = "created_at <= %s";
        $values[] = sanitize_text_field($params['date_to']) . ' 23:59:59';
    }

    $where_sql = implode(' AND ', $where);
    $table = $wpdb->prefix . 'casa_audit_logs';

    $logs = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table WHERE $where_sql ORDER BY created_at DESC LIMIT 10000",
        ...$values
    ), ARRAY_A);

    casa_log_audit('security', 'export_audit_logs', array(
        'metadata' => array('count' => count($logs), 'filters' => $params)
    ));

    return casa_generate_audit_csv_response($logs);
}

/**
 * Export super admin audit logs as CSV
 */
function casa_export_super_admin_audit_logs($request) {
    global $wpdb;

    if (!casa_is_super_admin()) {
        return new WP_REST_Response(array('success' => false, 'message' => 'Access denied'), 403);
    }

    $params = $request->get_params();
    $where = array("1=1");
    $values = array();

    if (!empty($params['organization_id'])) {
        $where[] = "al.organization_id = %d";
        $values[] = intval($params['organization_id']);
    }
    if (!empty($params['action_type'])) {
        $where[] = "al.action_type = %s";
        $values[] = sanitize_text_field($params['action_type']);
    }
    if (!empty($params['date_from'])) {
        $where[] = "al.created_at >= %s";
        $values[] = sanitize_text_field($params['date_from']) . ' 00:00:00';
    }
    if (!empty($params['date_to'])) {
        $where[] = "al.created_at <= %s";
        $values[] = sanitize_text_field($params['date_to']) . ' 23:59:59';
    }

    $where_sql = implode(' AND ', $where);
    $audit_table = $wpdb->prefix . 'casa_audit_logs';
    $org_table = $wpdb->prefix . 'casa_organizations';

    $sql = "SELECT al.*, o.name as organization_name
            FROM $audit_table al
            LEFT JOIN $org_table o ON al.organization_id = o.id
            WHERE $where_sql
            ORDER BY al.created_at DESC
            LIMIT 50000";

    if (!empty($values)) {
        $logs = $wpdb->get_results($wpdb->prepare($sql, ...$values), ARRAY_A);
    } else {
        $logs = $wpdb->get_results($sql, ARRAY_A);
    }

    casa_log_audit('security', 'export_all_audit_logs', array(
        'metadata' => array('count' => count($logs), 'filters' => $params)
    ));

    return casa_generate_audit_csv_response($logs, true);
}

/**
 * Generate CSV response for audit log export
 */
function casa_generate_audit_csv_response($logs, $include_org = false) {
    $csv_lines = array();

    // Header row
    $headers = array('ID', 'Timestamp', 'User Email', 'User Role', 'Action Type', 'Action',
                     'Resource Type', 'Resource ID', 'Resource Identifier', 'Status', 'Severity', 'IP Address');
    if ($include_org) {
        array_splice($headers, 2, 0, array('Organization'));
    }
    $csv_lines[] = implode(',', $headers);

    // Data rows
    foreach ($logs as $log) {
        $row = array(
            $log['id'],
            $log['created_at'],
            '"' . str_replace('"', '""', $log['user_email']) . '"',
            $log['user_role'],
            $log['action_type'],
            $log['action'],
            $log['resource_type'] ?? '',
            $log['resource_id'] ?? '',
            '"' . str_replace('"', '""', $log['resource_identifier'] ?? '') . '"',
            $log['status'],
            $log['severity'],
            $log['ip_address']
        );
        if ($include_org) {
            array_splice($row, 2, 0, array('"' . str_replace('"', '""', $log['organization_name'] ?? 'System') . '"'));
        }
        $csv_lines[] = implode(',', $row);
    }

    $csv_content = implode("\n", $csv_lines);

    return new WP_REST_Response($csv_content, 200, array(
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="audit_logs_' . date('Y-m-d_H-i-s') . '.csv"'
    ));
}
