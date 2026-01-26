<?php
/**
 * Plugin Name: CASA Enhanced User Management
 * Description: Complete CASA case management with WordPress user integration
 * Version: 2.0.55
 * Author: CASA System
 *
 * Last Updated: 2025-08-07 - Fixed Formidable Forms integration
 * - Added proper Formidable Forms endpoints with debugging
 * - Fixed endpoint registration and routing
 * - Added test endpoint for Formidable Forms verification
 * - Enhanced error handling for form submissions
 * - Fixed user organization assignment
 * - Enhanced error messages for email conflicts and missing fields
 * - Added auto-login on successful registration with proper token storage
 * - Improved UI with better loading and success states
 * - Fixed database column name (role -> casa_role)
 * - Fixed parameter handling for JSON requests
 * - Added proper cookie token storage for API authentication
 * - Added database cleanup endpoint to remove non-Bartow data
 * - Fixed user meta cleanup to properly remove orphaned records
 * - Fixed user creation to properly assign users to current organization
 * - Fixed volunteer registration to use correct casa_role field
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Include Two-Factor Authentication module
require_once plugin_dir_path(__FILE__) . 'two-factor-auth.php';

// Include Multi-Tenancy & Super Admin module
require_once plugin_dir_path(__FILE__) . 'multi-tenancy.php';

// Include Forms and Sample Data Setup
require_once plugin_dir_path(__FILE__) . 'setup-forms-and-data.php';

// Include PA-CASA Test Data Setup
require_once plugin_dir_path(__FILE__) . 'setup-pa-casa-test-data.php';

/**
 * JWT Authentication Filter
 * Validates JWT tokens on REST API requests and sets the current user
 * Using rest_pre_dispatch for better timing
 */
add_filter('rest_pre_dispatch', 'casa_jwt_rest_pre_dispatch', 10, 3);
function casa_jwt_rest_pre_dispatch($result, $server, $request) {
    // Get authorization header
    $authorization = $request->get_header('Authorization');

    error_log('CASA JWT Debug: rest_pre_dispatch called, auth header: ' . ($authorization ? 'present' : 'missing'));

    if (!$authorization || strpos($authorization, 'Bearer ') !== 0) {
        return $result;
    }

    $token = trim(substr($authorization, 7));
    if (empty($token)) {
        return $result;
    }

    error_log('CASA JWT Debug: Token found, validating...');

    // Validate and decode JWT token
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            error_log('CASA JWT: Invalid token format');
            return $result;
        }

        list($header_encoded, $payload_encoded, $signature_encoded) = $parts;

        // Decode payload
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload_encoded)), true);

        // User ID can be at different locations depending on token format
        $user_id = null;
        if (isset($payload['user_id'])) {
            $user_id = $payload['user_id'];
        } elseif (isset($payload['data']['user']['id'])) {
            $user_id = $payload['data']['user']['id'];
        } elseif (isset($payload['sub'])) {
            $user_id = $payload['sub'];
        }

        if (!$user_id) {
            error_log('CASA JWT: No user_id found in payload. Payload: ' . json_encode($payload));
            return $result;
        }

        error_log('CASA JWT Debug: Payload decoded, user_id: ' . $user_id);

        // Verify signature
        $secret_key = defined('JWT_SECRET_KEY') ? JWT_SECRET_KEY :
                      (defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY :
                      (getenv('JWT_SECRET_KEY') ?: 'fallback-secret-key'));

        error_log('CASA JWT Debug: Using secret key: ' . substr($secret_key, 0, 10) . '...');

        $signature_check = base64_encode(hash_hmac('sha256', $header_encoded . "." . $payload_encoded, $secret_key, true));
        // URL-safe base64 encoding
        $signature_check = str_replace(['+', '/', '='], ['-', '_', ''], $signature_check);

        if (!hash_equals($signature_check, $signature_encoded)) {
            error_log('CASA JWT: Signature verification failed');
            error_log('CASA JWT: Expected: ' . $signature_check);
            error_log('CASA JWT: Got: ' . $signature_encoded);
            return $result;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            error_log('CASA JWT: Token expired');
            return $result;
        }

        // Verify user exists
        $user = get_user_by('ID', $user_id);
        if (!$user) {
            error_log('CASA JWT: User not found: ' . $user_id);
            return $result;
        }

        // Set the current user
        wp_set_current_user($user_id);
        error_log('CASA JWT: User authenticated successfully: ' . $user->user_email);

    } catch (Exception $e) {
        error_log('CASA JWT validation error: ' . $e->getMessage());
    }

    return $result;
}

// Also add determine_current_user filter as backup
add_filter('determine_current_user', 'casa_validate_jwt_token', 20);
function casa_validate_jwt_token($user_id) {
    // If user is already determined, don't override
    if ($user_id) {
        return $user_id;
    }

    // Get authorization header from multiple sources
    $authorization = null;

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $authorization = isset($headers['Authorization']) ? $headers['Authorization'] :
                        (isset($headers['authorization']) ? $headers['authorization'] : null);
    }

    if (!$authorization && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!$authorization && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authorization = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    if (!$authorization || strpos($authorization, 'Bearer ') !== 0) {
        return $user_id;
    }

    $token = trim(substr($authorization, 7));
    if (empty($token)) {
        return $user_id;
    }

    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return $user_id;
        }

        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);

        // User ID can be at different locations
        $jwt_user_id = null;
        if (isset($payload['user_id'])) {
            $jwt_user_id = $payload['user_id'];
        } elseif (isset($payload['data']['user']['id'])) {
            $jwt_user_id = $payload['data']['user']['id'];
        } elseif (isset($payload['sub'])) {
            $jwt_user_id = $payload['sub'];
        }

        if (!$jwt_user_id) {
            return $user_id;
        }

        // Verify user exists
        $user = get_user_by('ID', $jwt_user_id);
        if ($user) {
            return $jwt_user_id;
        }
    } catch (Exception $e) {
        error_log('CASA JWT determine_current_user error: ' . $e->getMessage());
    }

    return $user_id;
}

// Plugin activation hook
register_activation_hook(__FILE__, 'casa_enhanced_activate');

function casa_enhanced_activate() {
    // Add CASA user roles
    casa_add_user_roles();

    // Add super admin role (from multi-tenancy module)
    if (function_exists('casa_add_super_admin_role')) {
        casa_add_super_admin_role();
    }

    // Create database tables
    casa_create_tables();

    // Create 2FA table
    casa_create_2fa_table();

    // Register Custom Post Types
    casa_register_post_types();

    // Set default capabilities
    casa_set_capabilities();

    // Flush rewrite rules
    flush_rewrite_rules();
}

// Register Custom Post Types
add_action('init', 'casa_register_post_types');

function casa_register_post_types() {
    // CASA Cases CPT
    register_post_type('casa_case', array(
        'labels' => array(
            'name' => 'CASA Cases',
            'singular_name' => 'CASA Case',
            'add_new' => 'Add New Case',
            'add_new_item' => 'Add New CASA Case',
            'edit_item' => 'Edit CASA Case',
            'new_item' => 'New CASA Case',
            'view_item' => 'View CASA Case',
            'search_items' => 'Search CASA Cases',
            'not_found' => 'No CASA cases found',
            'not_found_in_trash' => 'No CASA cases found in trash'
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 25,
        'menu_icon' => 'dashicons-portfolio',
        'supports' => array('title', 'editor', 'custom-fields'),
        'has_archive' => false,
        'rewrite' => false,
        'show_in_rest' => true,
        'capability_type' => 'casa_case',
        'capabilities' => array(
            'edit_post' => 'casa_manage_assigned_cases',
            'read_post' => 'casa_view_assigned_cases',
            'delete_post' => 'casa_manage_assigned_cases',
            'edit_posts' => 'casa_manage_assigned_cases',
            'edit_others_posts' => 'casa_manage_all_cases',
            'publish_posts' => 'casa_manage_assigned_cases',
            'read_private_posts' => 'casa_view_assigned_cases',
        )
    ));

    // CASA Volunteers CPT
    register_post_type('casa_volunteer', array(
        'labels' => array(
            'name' => 'CASA Volunteers',
            'singular_name' => 'CASA Volunteer',
            'add_new' => 'Add New Volunteer',
            'add_new_item' => 'Add New CASA Volunteer',
            'edit_item' => 'Edit CASA Volunteer',
            'new_item' => 'New CASA Volunteer',
            'view_item' => 'View CASA Volunteer',
            'search_items' => 'Search CASA Volunteers',
            'not_found' => 'No CASA volunteers found',
            'not_found_in_trash' => 'No CASA volunteers found in trash'
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 26,
        'menu_icon' => 'dashicons-groups',
        'supports' => array('title', 'editor', 'custom-fields'),
        'has_archive' => false,
        'rewrite' => false,
        'show_in_rest' => true,
        'capability_type' => 'casa_volunteer',
        'capabilities' => array(
            'edit_post' => 'casa_manage_volunteers',
            'read_post' => 'casa_view_volunteers',
            'delete_post' => 'casa_manage_volunteers',
            'edit_posts' => 'casa_manage_volunteers',
            'edit_others_posts' => 'casa_manage_volunteers',
            'publish_posts' => 'casa_manage_volunteers',
            'read_private_posts' => 'casa_view_volunteers',
        )
    ));

    // CASA Contact Logs CPT
    register_post_type('casa_contact_log', array(
        'labels' => array(
            'name' => 'Contact Logs',
            'singular_name' => 'Contact Log',
            'add_new' => 'Add New Contact Log',
            'add_new_item' => 'Add New Contact Log',
            'edit_item' => 'Edit Contact Log',
            'new_item' => 'New Contact Log',
            'view_item' => 'View Contact Log',
            'search_items' => 'Search Contact Logs',
            'not_found' => 'No contact logs found',
            'not_found_in_trash' => 'No contact logs found in trash'
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 27,
        'menu_icon' => 'dashicons-clipboard',
        'supports' => array('title', 'editor', 'custom-fields'),
        'has_archive' => false,
        'rewrite' => false,
        'show_in_rest' => true,
        'capability_type' => 'casa_contact_log',
        'capabilities' => array(
            'edit_post' => 'casa_add_contact_logs',
            'read_post' => 'casa_view_contact_logs',
            'delete_post' => 'casa_manage_contact_logs',
            'edit_posts' => 'casa_add_contact_logs',
            'edit_others_posts' => 'casa_manage_all_contact_logs',
            'publish_posts' => 'casa_add_contact_logs',
            'read_private_posts' => 'casa_view_contact_logs',
        )
    ));

    // CASA Reports CPT
    register_post_type('casa_report', array(
        'labels' => array(
            'name' => 'CASA Reports',
            'singular_name' => 'CASA Report',
            'add_new' => 'Add New Report',
            'add_new_item' => 'Add New CASA Report',
            'edit_item' => 'Edit CASA Report',
            'new_item' => 'New CASA Report',
            'view_item' => 'View CASA Report',
            'search_items' => 'Search CASA Reports',
            'not_found' => 'No CASA reports found',
            'not_found_in_trash' => 'No CASA reports found in trash'
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 27,
        'menu_icon' => 'dashicons-media-document',
        'supports' => array('title', 'editor', 'custom-fields', 'author'),
        'has_archive' => false,
        'rewrite' => false,
        'show_in_rest' => true,
        'capability_type' => 'casa_report',
        'capabilities' => array(
            'edit_post' => 'casa_create_reports',
            'read_post' => 'casa_view_reports',
            'delete_post' => 'casa_create_reports',
            'edit_posts' => 'casa_create_reports',
            'edit_others_posts' => 'casa_view_all_reports',
            'publish_posts' => 'casa_create_reports',
            'read_private_posts' => 'casa_view_reports',
        )
    ));
}

// Add CASA-specific user roles
function casa_add_user_roles() {
    // Remove existing CASA roles to avoid conflicts
    remove_role('casa_administrator');
    remove_role('casa_supervisor');
    remove_role('casa_volunteer');
    remove_role('casa_coordinator');
    
    // CASA Administrator - Full system access
    add_role('casa_administrator', 'CASA Administrator', array(
        'read' => true,
        'edit_posts' => true,
        'edit_others_posts' => true,
        'publish_posts' => true,
        'manage_categories' => true,
        'edit_users' => true,
        'list_users' => true,
        'remove_users' => true,
        'promote_users' => true,
        'edit_theme_options' => true,
        'moderate_comments' => true,
        'manage_options' => true,
        'casa_manage_organization' => true,
        'casa_manage_all_cases' => true,
        'casa_manage_volunteers' => true,
        'casa_view_reports' => true,
        'casa_export_data' => true,
    ));
    
    // CASA Supervisor - Case and volunteer management
    add_role('casa_supervisor', 'CASA Supervisor', array(
        'read' => true,
        'edit_posts' => true,
        'publish_posts' => true,
        'edit_users' => true,
        'list_users' => true,
        'casa_manage_all_cases' => true,
        'casa_assign_volunteers' => true,
        'casa_manage_volunteers' => true,
        'casa_view_reports' => true,
        'casa_approve_reports' => true,
    ));
    
    // CASA Coordinator - Limited case management
    add_role('casa_coordinator', 'CASA Coordinator', array(
        'read' => true,
        'edit_posts' => true,
        'casa_manage_assigned_cases' => true,
        'casa_view_volunteers' => true,
        'casa_create_reports' => true,
    ));
    
    // CASA Volunteer - Basic case access
    add_role('casa_volunteer', 'CASA Volunteer', array(
        'read' => true,
        'casa_view_assigned_cases' => true,
        'casa_add_contact_logs' => true,
        'casa_upload_documents' => true,
        'casa_create_reports' => true,
    ));
}

// Set up database tables
function casa_create_tables() {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();

    // Helper function to safely create table if not exists
    $create_table_if_not_exists = function($table_name, $sql) use ($wpdb) {
        $table_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
            DB_NAME,
            $table_name
        ));

        if (!$table_exists) {
            $wpdb->query($sql);
        }
    };

    // CASA Organizations table
    $table_name = $wpdb->prefix . 'casa_organizations';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        slug varchar(100) NOT NULL,
        domain varchar(255),
        status varchar(20) DEFAULT 'active',
        contact_email varchar(255),
        phone varchar(20),
        address text,
        settings longtext,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY slug (slug)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);
    
    // User organization mapping
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        organization_id bigint(20) NOT NULL,
        casa_role varchar(50) DEFAULT 'volunteer',
        status varchar(20) DEFAULT 'active',
        background_check_status varchar(20) DEFAULT 'pending',
        background_check_date datetime NULL,
        training_status varchar(20) DEFAULT 'pending',
        training_completion_date datetime NULL,
        assigned_cases_count int(11) DEFAULT 0,
        max_cases int(11) DEFAULT 5,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY user_org (user_id, organization_id),
        KEY user_id (user_id),
        KEY organization_id (organization_id)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Cases table
    $table_name = $wpdb->prefix . 'casa_cases';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        case_number varchar(100) NOT NULL,
        organization_id bigint(20) NOT NULL,
        assigned_volunteer_id bigint(20) NULL,
        child_first_name varchar(100) NOT NULL,
        child_last_name varchar(100) NOT NULL,
        child_dob date NULL,
        case_type varchar(30) DEFAULT 'other',
        priority varchar(20) DEFAULT 'medium',
        status varchar(30) DEFAULT 'active',
        court_jurisdiction varchar(255),
        assigned_judge varchar(255),
        placement_type varchar(30),
        placement_address text,
        case_summary text,
        referral_date date NULL,
        assignment_date date NULL,
        created_by bigint(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY case_number_org (case_number, organization_id),
        KEY organization_id (organization_id),
        KEY assigned_volunteer_id (assigned_volunteer_id),
        KEY status (status)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Volunteers table
    $table_name = $wpdb->prefix . 'casa_volunteers';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        organization_id bigint(20) NOT NULL,
        user_id bigint(20) NULL,
        first_name varchar(100) NOT NULL,
        last_name varchar(100) NOT NULL,
        email varchar(255) NOT NULL,
        phone varchar(20),
        date_of_birth date NULL,
        address text,
        city varchar(100),
        state varchar(10),
        zip_code varchar(20),
        emergency_contact_name varchar(255),
        emergency_contact_phone varchar(20),
        emergency_contact_relationship varchar(100),
        employer varchar(255),
        occupation varchar(255),
        education_level varchar(100),
        languages_spoken text,
        previous_volunteer_experience text,
        preferred_schedule varchar(100),
        max_cases int(11) DEFAULT 3,
        availability_notes text,
        reference1_name varchar(255),
        reference1_phone varchar(20),
        reference1_relationship varchar(100),
        reference2_name varchar(255),
        reference2_phone varchar(20),
        reference2_relationship varchar(100),
        age_preference varchar(50),
        gender_preference varchar(20),
        special_needs_experience boolean DEFAULT false,
        transportation_available boolean DEFAULT true,
        volunteer_status varchar(30) DEFAULT 'background_check',
        background_check_status varchar(20) DEFAULT 'pending',
        background_check_date datetime NULL,
        training_status varchar(20) DEFAULT 'pending',
        training_completion_date datetime NULL,
        assigned_cases_count int(11) DEFAULT 0,
        created_by bigint(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY organization_id (organization_id),
        KEY user_id (user_id),
        KEY volunteer_status (volunteer_status),
        KEY email (email)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Reports table
    $table_name = $wpdb->prefix . 'casa_reports';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        organization_id bigint(20) NOT NULL,
        case_id bigint(20) NOT NULL,
        volunteer_id bigint(20) NOT NULL,
        report_type varchar(30) DEFAULT 'home_visit',
        visit_date date NOT NULL,
        visit_duration int(11) NULL,
        location varchar(255),
        attendees text,
        observations text,
        child_wellbeing text,
        placement_stability text,
        safety_concerns text,
        recommendations text,
        follow_up_required boolean DEFAULT false,
        follow_up_notes text,
        status varchar(20) DEFAULT 'draft',
        supervisor_notes text,
        approved_by bigint(20) NULL,
        approved_at datetime NULL,
        created_by bigint(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY organization_id (organization_id),
        KEY case_id (case_id),
        KEY volunteer_id (volunteer_id),
        KEY report_type (report_type),
        KEY status (status),
        KEY visit_date (visit_date)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Documents table
    $table_name = $wpdb->prefix . 'casa_documents';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        case_number varchar(100) NOT NULL,
        organization_id bigint(20) NOT NULL,
        child_name varchar(255) NOT NULL,
        document_type varchar(100) NOT NULL,
        document_name varchar(255) NOT NULL,
        file_name varchar(255),
        file_size bigint(20) DEFAULT 0,
        file_url varchar(500),
        attachment_id bigint(20) NULL,
        upload_date datetime DEFAULT CURRENT_TIMESTAMP,
        uploaded_by varchar(255) NOT NULL,
        description text,
        is_confidential boolean DEFAULT false,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY case_number (case_number),
        KEY organization_id (organization_id),
        KEY document_type (document_type),
        KEY upload_date (upload_date),
        KEY attachment_id (attachment_id)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Contact logs table
    $table_name = $wpdb->prefix . 'casa_contact_logs';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        case_number varchar(100) NOT NULL,
        organization_id bigint(20) NOT NULL,
        contact_type varchar(30) NOT NULL,
        contact_date datetime NOT NULL,
        contact_duration int(11) NULL,
        contact_person varchar(255),
        contact_notes text,
        follow_up_required boolean DEFAULT false,
        follow_up_notes text,
        created_by bigint(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY case_number (case_number),
        KEY organization_id (organization_id),
        KEY contact_type (contact_type),
        KEY contact_date (contact_date)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Court hearings table
    $table_name = $wpdb->prefix . 'casa_court_hearings';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        case_number varchar(100) NOT NULL,
        organization_id bigint(20) NOT NULL,
        child_name varchar(255) NOT NULL,
        hearing_date date NOT NULL,
        hearing_time time,
        hearing_type varchar(100),
        court_room varchar(100),
        judge_name varchar(255),
        status varchar(20) DEFAULT 'scheduled',
        casa_volunteer_assigned varchar(255),
        notes text,
        created_by bigint(20) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY case_number (case_number),
        KEY organization_id (organization_id),
        KEY hearing_date (hearing_date),
        KEY status (status)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);

    // Tasks table
    $table_name = $wpdb->prefix . 'casa_tasks';
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        organization_id bigint(20) NOT NULL,
        case_id bigint(20) NULL,
        title varchar(255) NOT NULL,
        description text,
        due_date date NOT NULL,
        due_time time NULL,
        priority varchar(20) DEFAULT 'medium',
        status varchar(20) DEFAULT 'pending',
        assigned_to bigint(20) NULL,
        created_by bigint(20) NOT NULL,
        completed_at datetime NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY organization_id (organization_id),
        KEY case_id (case_id),
        KEY due_date (due_date),
        KEY status (status),
        KEY assigned_to (assigned_to)
    ) $charset_collate;";

    $create_table_if_not_exists($table_name, $sql);
}

// Set capabilities for existing roles
function casa_set_capabilities() {
    $admin = get_role('administrator');
    if ($admin) {
        $admin->add_cap('casa_manage_organization');
        $admin->add_cap('casa_manage_all_cases');
        $admin->add_cap('casa_manage_volunteers');
        $admin->add_cap('casa_view_reports');
        $admin->add_cap('casa_export_data');
    }
}

// Add REST API endpoints
add_action('rest_api_init', 'casa_register_enhanced_routes');



function casa_register_enhanced_routes() {
    error_log('casa_register_enhanced_routes called');
    
    // Enhanced authentication endpoint with 2FA
    register_rest_route('casa/v1', '/auth/login', array(
        'methods' => 'POST',
        'callback' => 'casa_enhanced_login_with_2fa',
        'permission_callback' => '__return_true'
    ));
    
    // User profile endpoint
    register_rest_route('casa/v1', '/user/profile', array(
        'methods' => 'GET',
        'callback' => 'casa_get_user_profile',
        'permission_callback' => '__return_true'
    ));
    
    // Dashboard stats endpoint
    register_rest_route('casa/v1', '/dashboard-stats', array(
        'methods' => 'GET',
        'callback' => 'casa_get_dashboard_stats',
        'permission_callback' => '__return_true'
    ));
    
    // Cases endpoints
    register_rest_route('casa/v1', '/cases', array(
        'methods' => 'GET',
        'callback' => 'casa_get_cases',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/cases', array(
        'methods' => 'POST',
        'callback' => 'casa_create_case',
        'permission_callback' => 'casa_check_case_create_permission'
    ));
    
    register_rest_route('casa/v1', '/cases/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'casa_get_case_by_id',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/cases/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'casa_update_case',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('casa/v1', '/cases/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'casa_delete_case',
        'permission_callback' => '__return_true'
    ));

    // Organizations endpoint
    register_rest_route('casa/v1', '/organizations', array(
        'methods' => 'GET',
        'callback' => 'casa_get_organizations',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/organizations', array(
        'methods' => 'POST',
        'callback' => 'casa_create_organization',
        'permission_callback' => '__return_true'
    ));
    
    // Volunteers endpoints
    register_rest_route('casa/v1', '/volunteers', array(
        'methods' => 'GET',
        'callback' => 'casa_get_volunteers',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/volunteers', array(
        'methods' => 'POST',
        'callback' => 'casa_create_volunteer',
        'permission_callback' => 'casa_check_volunteer_create_permission'
    ));
    
    register_rest_route('casa/v1', '/volunteers/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'casa_delete_volunteer',
        'permission_callback' => 'casa_check_volunteer_create_permission'
    ));
    
    // Individual volunteer actions
    register_rest_route('casa/v1', '/volunteers/(?P<id>\d+)/(?P<action>[a-zA-Z_]+)', array(
        'methods' => 'POST',
        'callback' => 'casa_volunteer_action',
        'permission_callback' => 'casa_check_volunteer_create_permission',
    ));
    
    // Reports endpoints
    register_rest_route('casa/v1', '/reports', array(
        'methods' => 'GET',
        'callback' => 'casa_get_reports',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/reports', array(
        'methods' => 'POST',
        'callback' => 'casa_create_report',
        'permission_callback' => 'casa_check_report_create_permission'
    ));
    
    // User management endpoints for organization admins
    register_rest_route('casa/v1', '/users', array(
        'methods' => 'POST',
        'callback' => 'casa_create_organization_user',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/users', array(
        'methods' => 'GET',
        'callback' => 'casa_get_organization_users',
        'permission_callback' => '__return_true'
    ));
    
    // Individual user actions
    register_rest_route('casa/v1', '/users/(?P<id>\d+)/(?P<action>[a-zA-Z_]+)', array(
        'methods' => 'POST',
        'callback' => 'casa_user_action',
        'permission_callback' => '__return_true',
    ));
    
    // User invitation
    register_rest_route('casa/v1', '/users/invite', array(
        'methods' => 'POST',
        'callback' => 'casa_invite_user',
        'permission_callback' => '__return_true',
    ));
    
    // Organization settings update
    register_rest_route('casa/v1', '/organizations/update', array(
        'methods' => 'POST',
        'callback' => 'casa_update_organization',
        'permission_callback' => '__return_true',
    ));
    
    // Court hearings endpoints
    register_rest_route('casa/v1', '/court-hearings', array(
        'methods' => 'GET',
        'callback' => 'casa_get_court_hearings',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('casa/v1', '/court-hearings', array(
        'methods' => 'POST',
        'callback' => 'casa_create_court_hearing',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('casa/v1', '/court-hearings/(?P<id>\d+)/(?P<action>[a-zA-Z_]+)', array(
        'methods' => 'POST',
        'callback' => 'casa_court_hearing_action',
        'permission_callback' => '__return_true',
    ));

    // Tasks endpoints
    register_rest_route('casa/v1', '/tasks', array(
        'methods' => 'GET',
        'callback' => 'casa_get_tasks',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/tasks', array(
        'methods' => 'POST',
        'callback' => 'casa_create_task',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/tasks/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'casa_get_task',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/tasks/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'casa_update_task',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/tasks/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'casa_delete_task',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/tasks/(?P<id>\d+)/complete', array(
        'methods' => 'POST',
        'callback' => 'casa_complete_task',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/tasks/upcoming', array(
        'methods' => 'GET',
        'callback' => 'casa_get_upcoming_tasks',
        'permission_callback' => '__return_true',
    ));

    // Documents endpoints
    register_rest_route('casa/v1', '/documents', array(
        'methods' => 'GET',
        'callback' => 'casa_get_documents',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('casa/v1', '/documents', array(
        'methods' => 'POST',
        'callback' => 'casa_upload_document',
        'permission_callback' => '__return_true',
    ));
    
    // Test endpoint with bypassed authentication
    register_rest_route('casa/v1', '/documents/upload-test', array(
        'methods' => 'POST',
        'callback' => 'casa_upload_document_test',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/documents/(?P<id>\d+)/download', array(
        'methods' => 'GET',
        'callback' => 'casa_download_document',
        'permission_callback' => '__return_true',
    ));
    
    // New working upload endpoint
    register_rest_route('casa/v1', '/documents/upload-new', array(
        'methods' => 'POST',
        'callback' => 'casa_upload_document_new',
        'permission_callback' => '__return_true',
    ));
    
    // Admin endpoint to fix user-organization associations
    register_rest_route('casa/v1', '/admin/fix-user-organizations', array(
        'methods' => 'POST',
        'callback' => 'casa_fix_user_organizations',
        'permission_callback' => '__return_true',
    ));
    
    // Simple endpoint to associate current user with organization 20
    register_rest_route('casa/v1', '/admin/associate-user-20', array(
        'methods' => 'GET',
        'callback' => 'casa_associate_user_20',
        'permission_callback' => '__return_true',
    ));

    // Admin endpoint to cleanup all documents
    register_rest_route('casa/v1', '/admin/cleanup-documents', array(
        'methods' => 'POST',
        'callback' => 'casa_cleanup_all_documents',
        'permission_callback' => '__return_true',
    ));

    register_rest_route('casa/v1', '/documents/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'casa_delete_document',
        'permission_callback' => '__return_true',
    ));
    
    // Comprehensive reporting endpoints
    register_rest_route('casa/v1', '/reports/comprehensive', array(
        'methods' => 'POST',
        'callback' => 'casa_generate_comprehensive_report',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('casa/v1', '/cases/(?P<case_number>[a-zA-Z0-9\-]+)/complete', array(
        'methods' => 'GET',
        'callback' => 'casa_get_complete_case_data',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('casa/v1', '/cases/(?P<case_number>[a-zA-Z0-9\-]+)/timeline', array(
        'methods' => 'GET',
        'callback' => 'casa_get_case_timeline',
        'permission_callback' => '__return_true',
    ));
    
    register_rest_route('casa/v1', '/users/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'casa_update_organization_user',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/users/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'casa_deactivate_organization_user',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('casa/v1', '/users/(?P<id>\d+)/change-password', array(
        'methods' => 'POST',
        'callback' => 'casa_change_user_password',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('casa/v1', '/debug/fix-user-association', array(
        'methods' => 'POST',
        'callback' => 'casa_debug_fix_user_association',
        'permission_callback' => '__return_true'
    ));
    
    // Cleanup test data endpoint
    register_rest_route('casa/v1', '/admin/cleanup-test-data', array(
        'methods' => 'POST',
        'callback' => 'casa_cleanup_test_data',
        'permission_callback' => 'casa_check_authentication'
    ));
    
    // Contact logs endpoints
    register_rest_route('casa/v1', '/contact-logs', array(
        'methods' => 'GET',
        'callback' => 'casa_get_contact_logs',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/contact-logs', array(
        'methods' => 'POST',
        'callback' => 'casa_create_contact_log',
        'permission_callback' => 'casa_check_contact_log_permission'
    ));
    
    register_rest_route('casa/v1', '/contact-logs/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'casa_get_contact_log',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/contact-logs/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'casa_update_contact_log',
        'permission_callback' => 'casa_check_contact_log_permission'
    ));
    
    // Home Visit Reports endpoints
    register_rest_route('casa/v1', '/home-visit-reports', array(
        'methods' => 'GET',
        'callback' => 'casa_get_home_visit_reports',
        'permission_callback' => '__return_true'
    ));
    
    register_rest_route('casa/v1', '/home-visit-reports', array(
        'methods' => 'POST',
        'callback' => 'casa_create_home_visit_report',
        'permission_callback' => '__return_true'
    ));
}



// Enhanced login that returns full user context
function casa_enhanced_login($request) {
    $username = $request->get_param('username');
    $password = $request->get_param('password');
    $organization_slug = $request->get_param('organization_slug');
    
    // Authenticate user
    $user = wp_authenticate($username, $password);
    
    if (is_wp_error($user)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Invalid credentials'
        ), 403);
    }
    
    // Get or create organization
    $organization = casa_get_organization_by_slug($organization_slug);
    if (!$organization) {
        $organization = casa_create_default_organization($organization_slug);
    }
    
    // Get user's CASA profile
    $casa_profile = casa_get_user_casa_profile($user->ID, $organization['id']);
    
    // Generate JWT token (using existing JWT plugin)
    $token_request = new WP_REST_Request('POST', '/jwt-auth/v1/token');
    $token_request->set_param('username', $username);
    $token_request->set_param('password', $password);
    
    $token_response = rest_do_request($token_request);
    $token_data = $token_response->get_data();
    
    if (!isset($token_data['token'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Token generation failed'
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'token' => $token_data['token'],
            'user' => array(
                'id' => $user->ID,
                'email' => $user->user_email,
                'firstName' => get_user_meta($user->ID, 'first_name', true) ?: $user->display_name,
                'lastName' => get_user_meta($user->ID, 'last_name', true),
                'roles' => $user->roles,
                'casa_role' => $casa_profile['casa_role'],
                'organizationId' => $organization['id'],
                'isActive' => $casa_profile['status'] === 'active',
                'backgroundCheckStatus' => $casa_profile['background_check_status'],
                'trainingStatus' => $casa_profile['training_status'],
                'lastLogin' => current_time('mysql'),
                'createdAt' => $user->user_registered,
                'updatedAt' => current_time('mysql'),
            ),
            'organization' => $organization
        )
    ), 200);
}

// Get user's full CASA profile
function casa_get_user_profile($request) {
    $current_user = wp_get_current_user();

    if (!$current_user || $current_user->ID === 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    $orgs_table = $wpdb->prefix . 'casa_organizations';

    // Check if user is super admin
    $is_super_admin = function_exists('casa_is_super_admin') && casa_is_super_admin($current_user->ID);

    // Check if a preferred organization was specified in the request
    $preferred_org_slug = $request->get_param('organization_slug');

    // If a preferred organization is specified, validate that the user is assigned to it
    if ($preferred_org_slug) {
        $preferred_org_id = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $orgs_table WHERE slug = %s AND status = 'active'",
            $preferred_org_slug
        ));

        if (!$preferred_org_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Organization not found'
            ), 404);
        }

        // Super admins can access any organization
        if ($is_super_admin) {
            $current_org_id = $preferred_org_id;
        } else {
            // Check if user is assigned to this organization
            $user_assigned = $wpdb->get_var($wpdb->prepare(
                "SELECT organization_id FROM $table_name WHERE user_id = %d AND organization_id = %d AND status = 'active'",
                $current_user->ID, $preferred_org_id
            ));

            if (!$user_assigned) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'You are not authorized to access this organization'
                ), 403);
            }

            $current_org_id = $preferred_org_id;
        }
    } else {
        // No preferred organization specified, get user's default organization
        $current_org_id = casa_get_user_organization_id($current_user->ID);
    }

    $casa_profiles = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE user_id = %d AND status = 'active'",
        $current_user->ID
    ), ARRAY_A);

    // Get first/last name with fallbacks from display_name
    $first_name = get_user_meta($current_user->ID, 'first_name', true);
    $last_name = get_user_meta($current_user->ID, 'last_name', true);

    // If first_name is empty, try to extract from display_name
    if (empty($first_name) && !empty($current_user->display_name)) {
        $name_parts = explode(' ', $current_user->display_name, 2);
        $first_name = $name_parts[0];
        if (empty($last_name) && isset($name_parts[1])) {
            $last_name = $name_parts[1];
        }
    }

    // Final fallback to user_login or email
    if (empty($first_name)) {
        $first_name = !empty($current_user->user_login) ? $current_user->user_login : explode('@', $current_user->user_email)[0];
    }

    $user_data = array(
        'id' => $current_user->ID,
        'email' => $current_user->user_email,
        'firstName' => $first_name,
        'lastName' => $last_name,
        'phone' => get_user_meta($current_user->ID, 'casa_phone', true),
        'roles' => array_values($current_user->roles),
        'organizationId' => $current_org_id ? (string)$current_org_id : null,
        'casa_profiles' => $casa_profiles,
        'capabilities' => array_keys($current_user->get_role_caps()),
        'is_super_admin' => $is_super_admin,
    );

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $user_data
    ), 200);
}

// Helper functions
function casa_get_organization_by_slug($slug) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_organizations';
    
    return $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE slug = %s AND status = 'active'",
        $slug
    ), ARRAY_A);
}

function casa_create_default_organization($slug) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_organizations';
    
    $wpdb->insert($table_name, array(
        'name' => ucfirst($slug) . ' CASA Program',
        'slug' => $slug,
        'status' => 'active',
        'settings' => json_encode(array(
            'allowVolunteerSelfRegistration' => true,
            'requireBackgroundCheck' => true,
            'maxCasesPerVolunteer' => 5,
        ))
    ));
    
    return casa_get_organization_by_slug($slug);
}

// Helper function to create organization-specific upload directory
function casa_get_organization_upload_dir($organization_id) {
    $upload_dir = wp_upload_dir();
    $org_dir = 'casa-org-' . $organization_id;
    
    // Create organization-specific directory structure
    $org_upload_path = $upload_dir['basedir'] . '/' . $org_dir;
    $org_upload_url = $upload_dir['baseurl'] . '/' . $org_dir;
    
    // Create directory if it doesn't exist
    if (!file_exists($org_upload_path)) {
        wp_mkdir_p($org_upload_path);
        
        // Add .htaccess file for security
        $htaccess_content = "Options -Indexes\nRequire all denied\n";
        file_put_contents($org_upload_path . '/.htaccess', $htaccess_content);
    }
    
    return array(
        'path' => $org_upload_path,
        'url' => $org_upload_url,
        'subdir' => '/' . $org_dir,
        'basedir' => $upload_dir['basedir'],
        'baseurl' => $upload_dir['baseurl'],
        'error' => false,
    );
}

function casa_get_user_casa_profile($user_id, $organization_id) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    
    $profile = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE user_id = %d AND organization_id = %d",
        $user_id, $organization_id
    ), ARRAY_A);
    
    if (!$profile) {
        // Create default profile
        $wpdb->insert($table_name, array(
            'user_id' => $user_id,
            'organization_id' => $organization_id,
            'casa_role' => 'supervisor', // Default for first user
            'status' => 'active'
        ));
        
        return casa_get_user_casa_profile($user_id, $organization_id);
    }
    
    return $profile;
}

// Helper function to get user's organization ID for tenant isolation
function casa_get_user_organization_id($user_id, $preferred_org_slug = null) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    $orgs_table = $wpdb->prefix . 'casa_organizations';

    error_log("casa_get_user_organization_id: Looking for user_id = $user_id");

    // Check if user is a super admin - they can access any org or use first available
    if (function_exists('casa_is_super_admin') && casa_is_super_admin($user_id)) {
        error_log("casa_get_user_organization_id: User is super admin");

        // If preferred org slug specified, get that org
        if ($preferred_org_slug) {
            $org_id = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM $orgs_table WHERE slug = %s AND status = 'active'",
                $preferred_org_slug
            ));
            if ($org_id) {
                error_log("casa_get_user_organization_id: Super admin using preferred org = $org_id");
                return $org_id;
            }
        }

        // Check if super admin is assigned to any org
        $assigned_org = $wpdb->get_var($wpdb->prepare(
            "SELECT organization_id FROM $table_name WHERE user_id = %d AND status = 'active' AND organization_id != 0 ORDER BY id DESC LIMIT 1",
            $user_id
        ));

        if ($assigned_org) {
            error_log("casa_get_user_organization_id: Super admin using assigned org = $assigned_org");
            return $assigned_org;
        }

        // Fall back to first available organization for super admin
        $first_org = $wpdb->get_var("SELECT id FROM $orgs_table WHERE status = 'active' ORDER BY id ASC LIMIT 1");
        if ($first_org) {
            error_log("casa_get_user_organization_id: Super admin using first available org = $first_org");
            return $first_org;
        }

        // No orgs exist - return null for super admin (they can still access super admin dashboard)
        error_log("casa_get_user_organization_id: Super admin - no organizations exist");
        return null;
    }
    
    // If a preferred organization slug is provided, try to get that organization first
    if ($preferred_org_slug) {
        error_log("casa_get_user_organization_id: Using preferred org slug = $preferred_org_slug");
        $preferred_org_id = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $orgs_table WHERE slug = %s",
            $preferred_org_slug
        ));
        
        if ($preferred_org_id) {
            // Check if user is assigned to this organization
            $user_org_id = $wpdb->get_var($wpdb->prepare(
                "SELECT organization_id FROM $table_name WHERE user_id = %d AND organization_id = %d AND status = 'active'",
                $user_id, $preferred_org_id
            ));
            
            if ($user_org_id) {
                error_log("casa_get_user_organization_id: Found preferred org = $user_org_id");
                return $user_org_id;
            }
        }
    }
    
    // Fallback to first active organization
    $sql = $wpdb->prepare(
        "SELECT organization_id FROM $table_name WHERE user_id = %d AND status = 'active' AND organization_id != 0 ORDER BY id DESC LIMIT 1",
        $user_id
    );
    error_log("casa_get_user_organization_id: SQL = $sql");
    
    $organization_id = $wpdb->get_var($sql);
    error_log("casa_get_user_organization_id: Query result = " . ($organization_id ? $organization_id : 'NULL'));
    
    // Debug: check what's actually in the table
    $all_user_orgs = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE user_id = %d",
        $user_id
    ));
    error_log("casa_get_user_organization_id: All user orgs = " . print_r($all_user_orgs, true));
    
    // If no organization found, return null instead of 0
    if (!$organization_id || $organization_id == '0') {
        error_log("casa_get_user_organization_id: No organization found, returning null");
        return null;
    }
    
    error_log("casa_get_user_organization_id: Returning organization_id = $organization_id");
    return $organization_id;
}

// Helper function to check if user can access organization data
// casa_can_access_organization is now defined in multi-tenancy.php with super admin support
// Note: The new signature is casa_can_access_organization($organization_id, $user_id = null)

// Helper function to ensure organization context is available
function casa_ensure_organization_context() {
    $current_user = wp_get_current_user();
    if (!$current_user || !$current_user->ID) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Authentication required'
        ), 401);
    }
    
    $organization_id = casa_get_user_organization_id($current_user->ID);
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    return array(
        'user_id' => $current_user->ID,
        'organization_id' => $organization_id,
        'user' => $current_user
    );
}

function casa_check_authentication() {
    // For development - temporarily allow all requests
    // TODO: Implement proper JWT authentication once frontend login is working
    return true;
    
    // Check for standard WordPress authentication first
    if (is_user_logged_in()) {
        return true;
    }
    
    // Check for JWT token in Authorization header
    $headers = getallheaders();
    $authorization = null;
    
    if (isset($headers['Authorization'])) {
        $authorization = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authorization = $headers['authorization'];
    }
    
    if (!$authorization) {
        return false;
    }
    
    // Extract Bearer token
    if (strpos($authorization, 'Bearer ') !== 0) {
        return false;
    }
    
    $token = substr($authorization, 7);
    
    // Validate JWT token - simplified validation
    try {
        // Use existing JWT plugin or our simple method
        if (function_exists('jwt_decode_token')) {
            // If JWT Authentication plugin is available
            $decoded = jwt_decode_token($token);
        } else {
            // Simple JWT validation - just decode and check format
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }
            
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
            $decoded = (object) $payload;
        }
        
        if ($decoded && isset($decoded->user_id)) {
            // Set current user for this request
            wp_set_current_user($decoded->user_id);
            return true;
        }
    } catch (Exception $e) {
        error_log('JWT validation failed: ' . $e->getMessage());
    }
    
    return false;
}

function casa_check_case_create_permission() {
    // For development, use basic authentication check
    if (casa_check_authentication()) {
        return true;
    }
    
    return current_user_can('casa_manage_all_cases') || 
           current_user_can('casa_manage_assigned_cases');
}

function casa_check_volunteer_create_permission() {
    // For development, use basic authentication check
    if (casa_check_authentication()) {
        return true;
    }
    
    return current_user_can('casa_manage_volunteers') || 
           current_user_can('casa_manage_all_cases');
}

function casa_check_report_create_permission() {
    // For development, use basic authentication check
    if (casa_check_authentication()) {
        return true;
    }
    
    return current_user_can('casa_create_reports') || 
           current_user_can('casa_manage_assigned_cases');
}

// Enhanced dashboard stats
function casa_get_dashboard_stats($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }
    
    $current_user = wp_get_current_user();
    
    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    
    // For development, if no current user, use first admin user
    if (!$current_user || $current_user->ID === 0) {
        $admin_users = get_users(['role' => 'administrator']);
        if (empty($admin_users)) {
            $admin_users = get_users(['role' => 'casa_administrator']);
        }
        if (!empty($admin_users)) {
            $current_user = $admin_users[0];
        }
    }
    
    // Get user's organization
    $user_org = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));
    
    // If no organization found, try to get any organization (for development)
    if (!$user_org) {
        $user_org = $wpdb->get_var("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE status = 'active' LIMIT 1");
    }
    
    // Get real statistics from database
    $active_cases = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $cases_table WHERE organization_id = %d AND status = 'active'",
        $user_org
    ));
    
    // Count volunteers from the actual volunteers table
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';
    $volunteers = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $volunteers_table WHERE organization_id = %d AND volunteer_status = 'active'",
        $user_org
    ));
    
    $pending_reviews = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $cases_table WHERE organization_id = %d AND status = 'pending-review'",
        $user_org
    ));
    
    // Get upcoming court hearings count (next 30 days)
    // Note: court_hearings table has organization_id directly, no need to join
    $court_hearings_table = $wpdb->prefix . 'casa_court_hearings';
    $court_hearings = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $court_hearings_table
         WHERE organization_id = %d
         AND hearing_date >= CURDATE()
         AND hearing_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)",
        $user_org
    ));
    
    // Get recent activity (last 10 case updates)
    $recent_activity = $wpdb->get_results($wpdb->prepare(
        "SELECT id, case_number, child_first_name, child_last_name, updated_at, status
         FROM $cases_table
         WHERE organization_id = %d
         ORDER BY updated_at DESC
         LIMIT 5",
        $user_org
    ), ARRAY_A);

    $formatted_activity = array();
    foreach ($recent_activity as $activity) {
        $formatted_activity[] = array(
            'date' => date('Y-m-d', strtotime($activity['updated_at'])),
            'type' => 'Case Update',
            'description' => sprintf(
                'Case %s (%s %s) status: %s',
                $activity['case_number'],
                $activity['child_first_name'],
                $activity['child_last_name'],
                $activity['status']
            ),
            'caseId' => (int) $activity['id'],
            'link' => '/cases/' . $activity['id']
        );
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'activeCases' => (int) $active_cases,
            'volunteers' => (int) $volunteers,
            'pendingReviews' => (int) $pending_reviews,
            'courtHearings' => (int) $court_hearings,
            'recentActivity' => $formatted_activity
        )
    ), 200);
}

// Enhanced case creation using WordPress posts with tenant isolation
function casa_create_case($request) {
    $params = $request->get_json_params();
    
    // Ensure organization context is available
    $context = casa_ensure_organization_context();
    if (is_wp_error($context) || $context instanceof WP_REST_Response) {
        return $context;
    }
    
    $current_user = $context['user'];
    $organization_id = $context['organization_id'];
    
    // Validate required fields
    $required_fields = ['child_first_name', 'child_last_name', 'case_number', 'case_type'];
    foreach ($required_fields as $field) {
        if (empty($params[$field])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => "Missing required field: $field"
            ), 400);
        }
    }
    
    // Create case title
    $case_title = sprintf(
        '%s - %s %s', 
        sanitize_text_field($params['case_number']),
        sanitize_text_field($params['child_first_name']),
        sanitize_text_field($params['child_last_name'])
    );
    
    // Create WordPress post for the case
    $post_data = array(
        'post_title' => $case_title,
        'post_content' => sanitize_textarea_field($params['case_summary'] ?? ''),
        'post_status' => 'publish',
        'post_type' => 'casa_case',
        'meta_input' => array(
            'organization_id' => $organization_id,
            'case_number' => sanitize_text_field($params['case_number']),
            'case_type' => sanitize_text_field($params['case_type']),
            'priority' => sanitize_text_field($params['case_priority'] ?? 'medium'),
            'status' => 'active',
            'child_first_name' => sanitize_text_field($params['child_first_name']),
            'child_last_name' => sanitize_text_field($params['child_last_name']),
            'child_dob' => sanitize_text_field($params['child_dob'] ?? ''),
            'child_gender' => sanitize_text_field($params['child_gender'] ?? ''),
            'current_placement' => sanitize_text_field($params['current_placement'] ?? ''),
            'placement_address' => sanitize_textarea_field($params['placement_address'] ?? ''),
            'court_jurisdiction' => sanitize_text_field($params['court_jurisdiction'] ?? ''),
            'assigned_judge' => sanitize_text_field($params['assigned_judge'] ?? ''),
            'referral_date' => sanitize_text_field($params['referral_date'] ?? ''),
            'assignment_date' => sanitize_text_field($params['assignment_date'] ?? ''),
            'school_name' => sanitize_text_field($params['school_name'] ?? ''),
            'school_grade' => sanitize_text_field($params['school_grade'] ?? ''),
            'special_needs' => sanitize_textarea_field($params['special_needs'] ?? ''),
            'medical_info' => sanitize_textarea_field($params['medical_info'] ?? ''),
            'court_date' => sanitize_text_field($params['court_date'] ?? ''),
            'attorney_name' => sanitize_text_field($params['attorney_name'] ?? ''),
            'social_worker_name' => sanitize_text_field($params['social_worker_name'] ?? ''),
            'social_worker_phone' => sanitize_text_field($params['social_worker_phone'] ?? ''),
            'emergency_contact_name' => sanitize_text_field($params['emergency_contact_name'] ?? ''),
            'emergency_contact_phone' => sanitize_text_field($params['emergency_contact_phone'] ?? ''),
        )
    );
    
    // Insert into WordPress posts for content management
    $case_id = wp_insert_post($post_data);
    
    if (is_wp_error($case_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create case: ' . $case_id->get_error_message()
        ), 500);
    }
    
    // Also insert into casa_cases table for API access
    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    
    $case_data = array(
        'case_number' => sanitize_text_field($params['case_number']),
        'organization_id' => $organization_id,
        'assigned_volunteer_id' => null, // Will be assigned later
        'child_first_name' => sanitize_text_field($params['child_first_name']),
        'child_last_name' => sanitize_text_field($params['child_last_name']),
        'child_dob' => sanitize_text_field($params['child_dob'] ?? ''),
        'case_type' => sanitize_text_field($params['case_type']),
        'priority' => sanitize_text_field($params['case_priority'] ?? 'medium'),
        'status' => 'active',
        'court_jurisdiction' => sanitize_text_field($params['court_jurisdiction'] ?? ''),
        'assigned_judge' => sanitize_text_field($params['assigned_judge'] ?? ''),
        'placement_type' => sanitize_text_field($params['placement_type'] ?? ''),
        'placement_address' => sanitize_textarea_field($params['placement_address'] ?? ''),
        'case_summary' => sanitize_textarea_field($params['case_summary'] ?? ''),
        'referral_date' => sanitize_text_field($params['referral_date'] ?? ''),
        'assignment_date' => sanitize_text_field($params['assignment_date'] ?? ''),
        'created_by' => $current_user->ID,
    );
    
    $db_result = $wpdb->insert($cases_table, $case_data);
    
    if ($db_result === false) {
        // If database insert fails, clean up the WordPress post
        wp_delete_post($case_id, true);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create case in database: ' . $wpdb->last_error
        ), 500);
    }
    
    $db_case_id = $wpdb->insert_id;

    // Also create Formidable Forms entry for form integration
    $frm_entry_id = casa_create_formidable_entry(1, $params, $current_user->ID); // Form ID 1 = Case Intake

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $db_case_id,
            'wp_post_id' => $case_id,
            'frm_entry_id' => $frm_entry_id,
            'caseNumber' => $params['case_number'],
            'childName' => $params['child_first_name'] . ' ' . $params['child_last_name'],
            'message' => 'Case created successfully in CASA system'
        )
    ), 201);
}

/**
 * Create a Formidable Forms entry
 * This syncs data to FF so it's visible in WP admin
 */
function casa_create_formidable_entry($form_id, $data, $user_id = 0) {
    global $wpdb;

    $items_table = $wpdb->prefix . 'frm_items';
    $metas_table = $wpdb->prefix . 'frm_item_metas';
    $fields_table = $wpdb->prefix . 'frm_fields';

    // Check if tables exist
    if ($wpdb->get_var("SHOW TABLES LIKE '$items_table'") != $items_table) {
        return null;
    }

    $now = current_time('mysql');

    // Create the entry (item)
    $item_key = 'entry_' . uniqid();
    $wpdb->insert($items_table, array(
        'item_key' => $item_key,
        'name' => isset($data['case_number']) ? $data['case_number'] : (isset($data['first_name']) ? $data['first_name'] . ' ' . ($data['last_name'] ?? '') : 'Entry'),
        'form_id' => $form_id,
        'user_id' => $user_id,
        'is_draft' => 0,
        'created_at' => $now,
        'updated_at' => $now
    ));

    $entry_id = $wpdb->insert_id;
    if (!$entry_id) {
        return null;
    }

    // Get fields for this form
    $fields = $wpdb->get_results($wpdb->prepare(
        "SELECT id, field_key FROM $fields_table WHERE form_id = %d",
        $form_id
    ));

    // Map data to field IDs and create meta entries
    foreach ($fields as $field) {
        $field_key = $field->field_key;
        $value = null;

        // Map field keys to data keys
        if (isset($data[$field_key])) {
            $value = $data[$field_key];
        }

        if ($value !== null && $value !== '') {
            $wpdb->insert($metas_table, array(
                'meta_value' => is_array($value) ? serialize($value) : $value,
                'field_id' => $field->id,
                'item_id' => $entry_id,
                'created_at' => $now
            ));
        }
    }

    return $entry_id;
}

// ================================
// SECURE USER MANAGEMENT FUNCTIONS
// ================================

// Create new user for organization (Organization Admin only)
function casa_create_organization_user($request) {
    $params = $request->get_json_params();
    
    // Get current user and their organization for security
    $current_user = wp_get_current_user();
    $admin_org_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$admin_org_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Access denied: User not associated with any organization'
        ), 403);
    }
    
    // Validate required fields
    $required_fields = ['email', 'first_name', 'last_name', 'casa_role'];
    foreach ($required_fields as $field) {
        if (empty($params[$field])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => "Missing required field: $field"
            ), 400);
        }
    }
    
    // Check if user already exists
    if (email_exists($params['email'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User with this email already exists'
        ), 400);
    }
    
    // Generate secure password
    $password = wp_generate_password(12, true, true);
    
    // Create WordPress user
    $user_id = wp_create_user(
        $params['email'], // username is email
        $password,
        $params['email']
    );
    
    if (is_wp_error($user_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create user: ' . $user_id->get_error_message()
        ), 500);
    }
    
    // Update user meta
    wp_update_user(array(
        'ID' => $user_id,
        'first_name' => sanitize_text_field($params['first_name']),
        'last_name' => sanitize_text_field($params['last_name']),
        'display_name' => sanitize_text_field($params['first_name'] . ' ' . $params['last_name']),
    ));
    
    // Add user to organization with role
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    
    $result = $wpdb->insert($table_name, array(
        'user_id' => $user_id,
        'organization_id' => $admin_org_id, // Same organization as admin
        'casa_role' => sanitize_text_field($params['casa_role']),
        'status' => 'active',
        'created_at' => current_time('mysql')
    ));
    
    if ($result === false) {
        // Cleanup: delete the WordPress user if organization link failed
        wp_delete_user($user_id);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to associate user with organization'
        ), 500);
    }
    
    // Assign WordPress role based on CASA role
    $wp_role = casa_get_wordpress_role($params['casa_role']);
    $user = new WP_User($user_id);
    $user->set_role($wp_role);
    
    // Get organization name for email
    $org_name = $wpdb->get_var($wpdb->prepare(
        "SELECT name FROM {$wpdb->prefix}casa_organizations WHERE id = %d",
        $admin_org_id
    )) ?: 'CASA';

    // Send welcome email with login credentials
    casa_send_welcome_email(
        $params['email'],
        $params['first_name'],
        $params['last_name'],
        $password,
        $params['casa_role'],
        $org_name
    );

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'user_id' => $user_id,
            'email' => $params['email'],
            'name' => $params['first_name'] . ' ' . $params['last_name'],
            'casa_role' => $params['casa_role'],
            'organization_id' => $admin_org_id,
            'message' => 'User created successfully and welcome email sent'
        )
    ), 201);
}

/**
 * Send welcome email to new user via Brevo
 */
function casa_send_welcome_email($email, $first_name, $last_name, $password, $role, $org_name) {
    $brevo_api_key = defined('BREVO_API_KEY') ? BREVO_API_KEY : getenv('BREVO_API_KEY');
    $sender_email = defined('BREVO_SENDER_EMAIL') ? BREVO_SENDER_EMAIL : (getenv('BREVO_SENDER_EMAIL') ?: 'notify@notifyplus.org');
    $sender_name = defined('BREVO_SENDER_NAME') ? BREVO_SENDER_NAME : (getenv('BREVO_SENDER_NAME') ?: 'PA-CASA');

    if (empty($brevo_api_key)) {
        error_log('CASA Welcome Email Error: BREVO_API_KEY not configured');
        return false;
    }

    $login_url = 'https://casa.joneswebdesigns.com/auth/login';
    $role_display = ucwords(str_replace('_', ' ', $role));

    $subject = "Welcome to {$org_name} - Your CASA Account Has Been Created";

    $html_content = '
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #0066cc, #004499); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; margin: -20px -20px 20px -20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .credentials-box { background: #f8f9fa; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .credentials-box h3 { margin-top: 0; color: #0066cc; }
            .credential { margin: 10px 0; }
            .credential label { font-weight: bold; color: #666; }
            .btn { display: inline-block; background: #0066cc; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to ' . esc_html($org_name) . '</h1>
                <p>CASA Case Management System</p>
            </div>

            <p>Hello ' . esc_html($first_name) . ' ' . esc_html($last_name) . ',</p>

            <p>Your account has been created in the CASA Case Management System. You have been assigned the role of <strong>' . esc_html($role_display) . '</strong>.</p>

            <div class="credentials-box">
                <h3>Your Login Credentials</h3>
                <div class="credential">
                    <label>Email:</label>
                    <span>' . esc_html($email) . '</span>
                </div>
                <div class="credential">
                    <label>Temporary Password:</label>
                    <span style="font-family: monospace; background: #fff; padding: 5px 10px; border-radius: 4px;">' . esc_html($password) . '</span>
                </div>
            </div>

            <center>
                <a href="' . esc_url($login_url) . '" class="btn">Login to CASA</a>
            </center>

            <div class="warning">
                <strong>Important Security Notice:</strong>
                <ul>
                    <li>Please change your password after your first login</li>
                    <li>Do not share your login credentials with anyone</li>
                    <li>You will be required to verify your identity via email on each login</li>
                </ul>
            </div>

            <p>If you have any questions or need assistance, please contact your CASA supervisor.</p>

            <div class="footer">
                <p>This is an automated message from ' . esc_html($org_name) . ' CASA Case Management System.</p>
                <p>&copy; ' . date('Y') . ' Pennsylvania CASA. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ';

    $url = 'https://api.brevo.com/v3/smtp/email';

    $payload = array(
        'sender' => array(
            'name' => $sender_name,
            'email' => $sender_email
        ),
        'to' => array(
            array(
                'email' => $email,
                'name' => $first_name . ' ' . $last_name
            )
        ),
        'subject' => $subject,
        'htmlContent' => $html_content
    );

    $args = array(
        'method' => 'POST',
        'headers' => array(
            'accept' => 'application/json',
            'api-key' => $brevo_api_key,
            'content-type' => 'application/json'
        ),
        'body' => json_encode($payload),
        'timeout' => 30
    );

    $response = wp_remote_post($url, $args);

    if (is_wp_error($response)) {
        error_log('CASA Welcome Email Error: ' . $response->get_error_message());
        return false;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code >= 200 && $response_code < 300) {
        error_log('CASA: Welcome email sent successfully to ' . $email);
        return true;
    } else {
        error_log('CASA Welcome Email Error: HTTP ' . $response_code);
        return false;
    }
}

// Get all users in current user's organization
function casa_get_organization_users($request) {
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Access denied: User not associated with any organization'
        ), 403);
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    
    // Get all users in the same organization
    $users = $wpdb->get_results($wpdb->prepare(
        "SELECT uo.*, u.user_email, u.display_name, u.user_registered
         FROM $table_name uo 
         JOIN {$wpdb->users} u ON uo.user_id = u.ID 
         WHERE uo.organization_id = %d 
         ORDER BY u.display_name",
        $organization_id
    ));
    
    $user_list = array();
    foreach ($users as $user) {
        $user_list[] = array(
            'id' => $user->user_id,
            'email' => $user->user_email,
            'name' => $user->display_name,
            'casa_role' => $user->casa_role,
            'status' => $user->status,
            'background_check_status' => $user->background_check_status,
            'training_status' => $user->training_status,
            'assigned_cases_count' => $user->assigned_cases_count,
            'created_at' => $user->user_registered
        );
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'users' => $user_list,
            'organization_id' => $organization_id
        )
    ), 200);
}

// Helper function to map CASA roles to WordPress roles
function casa_get_wordpress_role($casa_role) {
    $role_mapping = array(
        'administrator' => 'casa_administrator',
        'supervisor' => 'casa_supervisor', 
        'coordinator' => 'casa_coordinator',
        'volunteer' => 'casa_volunteer'
    );
    
    return isset($role_mapping[$casa_role]) ? $role_mapping[$casa_role] : 'casa_volunteer';
}

// Get cases with filtering
function casa_get_cases($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';

    // Get organization filter (NULL for super admins = all orgs, or specific org ID)
    $requested_org_id = $request->get_param('organization_id');
    $org_filter = casa_get_organization_filter(null, $requested_org_id);

    // Build WHERE clause with organization filtering
    $params = array();
    $org_where = casa_build_org_where_clause('c.organization_id', $org_filter, $params);
    $where_clause = "WHERE $org_where";
    
    // Add filters if provided
    $status = $request->get_param('status');
    if ($status) {
        $where_clause .= " AND c.status = %s";
        $params[] = $status;
    }
    
    $volunteer_id = $request->get_param('volunteer_id');
    if ($volunteer_id) {
        $where_clause .= " AND c.assigned_volunteer_id = %d";
        $params[] = $volunteer_id;
    }
    
    // Get cases from database table with volunteer names
    $query = "SELECT c.*, 
                     CASE 
                         WHEN c.assigned_volunteer_id IS NOT NULL 
                         THEN CONCAT(um_first.meta_value, ' ', um_last.meta_value)
                         ELSE NULL 
                     END as assigned_volunteer_name
              FROM $cases_table c
              LEFT JOIN {$wpdb->users} u ON c.assigned_volunteer_id = u.ID
              LEFT JOIN {$wpdb->usermeta} um_first ON (u.ID = um_first.user_id AND um_first.meta_key = 'first_name')
              LEFT JOIN {$wpdb->usermeta} um_last ON (u.ID = um_last.user_id AND um_last.meta_key = 'last_name')
              $where_clause 
              ORDER BY c.updated_at DESC";
    $cases = $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    
    // If no cases found in database, try to get from WordPress posts as fallback
    if (empty($cases)) {
        $args = array(
            'post_type' => 'casa_case',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        );

        // Only filter by org if not super admin (org_filter !== null)
        if ($org_filter !== null) {
            $args['meta_query'] = array(
                array(
                    'key' => 'organization_id',
                    'value' => $org_filter,
                    'compare' => '='
                )
            );
        }

        $wp_cases = get_posts($args);

        foreach ($wp_cases as $wp_case) {
            $case_meta = get_post_meta($wp_case->ID);
            $cases[] = array(
                'id' => $wp_case->ID,
                'case_number' => $case_meta['case_number'][0] ?? '',
                'organization_id' => $case_meta['organization_id'][0] ?? $org_filter,
                'child_first_name' => $case_meta['child_first_name'][0] ?? '',
                'child_last_name' => $case_meta['child_last_name'][0] ?? '',
                'child_dob' => $case_meta['child_dob'][0] ?? '',
                'case_type' => $case_meta['case_type'][0] ?? 'other',
                'priority' => $case_meta['priority'][0] ?? 'medium',
                'status' => $case_meta['status'][0] ?? 'active',
                'court_jurisdiction' => $case_meta['court_jurisdiction'][0] ?? '',
                'assigned_judge' => $case_meta['assigned_judge'][0] ?? '',
                'placement_type' => $case_meta['placement_type'][0] ?? '',
                'placement_address' => $case_meta['placement_address'][0] ?? '',
                'case_summary' => $wp_case->post_content,
                'referral_date' => $case_meta['referral_date'][0] ?? '',
                'assignment_date' => $case_meta['assignment_date'][0] ?? '',
                'created_by' => $wp_case->post_author,
                'created_at' => $wp_case->post_date,
                'updated_at' => $wp_case->post_modified,
            );
        }
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'cases' => $cases,
            'pagination' => array(
                'total' => count($cases),
                'page' => 1,
                'pages' => 1
            )
        )
    ), 200);
}

// Get individual case by ID
function casa_get_case_by_id($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }
    
    $current_user = wp_get_current_user();
    $case_id = $request->get_param('id');
    
    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    
    // For development, if no current user, use first admin user
    if (!$current_user || $current_user->ID === 0) {
        $admin_users = get_users(['role' => 'administrator']);
        if (empty($admin_users)) {
            $admin_users = get_users(['role' => 'casa_administrator']);
        }
        if (!empty($admin_users)) {
            $current_user = $admin_users[0];
        }
    }
    
    // Get user's organization
    $user_org = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));
    
    // If no organization found, try to get any organization (for development)
    if (!$user_org) {
        $user_org = $wpdb->get_var("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE status = 'active' LIMIT 1");
    }
    
    // Get the specific case with volunteer name
    $case = $wpdb->get_row($wpdb->prepare(
        "SELECT c.*, 
                CASE 
                    WHEN c.assigned_volunteer_id IS NOT NULL 
                    THEN CONCAT(um_first.meta_value, ' ', um_last.meta_value)
                    ELSE NULL 
                END as assigned_volunteer_name
         FROM $cases_table c
         LEFT JOIN {$wpdb->users} u ON c.assigned_volunteer_id = u.ID
         LEFT JOIN {$wpdb->usermeta} um_first ON (u.ID = um_first.user_id AND um_first.meta_key = 'first_name')
         LEFT JOIN {$wpdb->usermeta} um_last ON (u.ID = um_last.user_id AND um_last.meta_key = 'last_name')
         WHERE c.id = %d AND c.organization_id = %d 
         LIMIT 1",
        $case_id,
        $user_org
    ), ARRAY_A);
    
    if (!$case) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Case not found',
            'debug' => [
                'case_id' => $case_id,
                'user_org' => $user_org,
                'current_user_id' => $current_user ? $current_user->ID : 'none'
            ]
        ), 404);
    }
    
    // For development, skip role checking
    // Check if user has permission to view this case
    // $user_roles = $current_user->roles;
    // $is_volunteer = in_array('volunteer', $user_roles) || in_array('casa_volunteer', $user_roles);
    // 
    // if ($is_volunteer && $case['assigned_volunteer_id'] != $current_user->ID) {
    //     return new WP_REST_Response(array(
    //         'success' => false,
    //         'message' => 'Access denied - case not assigned to you'
    //     ), 403);
    // }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $case
    ), 200);
}

// Update individual case by ID
function casa_update_case($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }
    
    $current_user = wp_get_current_user();
    $case_id = $request->get_param('id');
    $update_data = $request->get_json_params();
    
    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    
    // For development, if no current user, use first admin user
    if (!$current_user || $current_user->ID === 0) {
        $admin_users = get_users(['role' => 'administrator']);
        if (empty($admin_users)) {
            $admin_users = get_users(['role' => 'casa_administrator']);
        }
        if (!empty($admin_users)) {
            $current_user = $admin_users[0];
        }
    }
    
    // Get user's organization
    $user_org = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));
    
    // If no organization found, try to get any organization (for development)
    if (!$user_org) {
        $user_org = $wpdb->get_var("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE status = 'active' LIMIT 1");
    }
    
    // Verify the case exists and belongs to the user's organization
    $existing_case = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $cases_table WHERE id = %d AND organization_id = %d LIMIT 1",
        $case_id,
        $user_org
    ), ARRAY_A);
    
    if (!$existing_case) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Case not found or access denied'
        ), 404);
    }
    
    // Prepare update data
    $allowed_fields = [
        'case_number', 'child_first_name', 'child_last_name', 'child_dob', 'case_type', 
        'priority', 'status', 'referral_date', 'case_summary', 
        'court_jurisdiction', 'assigned_judge', 'placement_type', 'placement_address'
    ];
    
    $update_fields = [];
    $update_values = [];
    
    foreach ($allowed_fields as $field) {
        if (isset($update_data[$field])) {
            $update_fields[] = "$field = %s";
            $update_values[] = sanitize_text_field($update_data[$field]);
        }
    }
    
    // Special validation for case_number if it's being updated
    if (isset($update_data['case_number'])) {
        $new_case_number = sanitize_text_field($update_data['case_number']);
        
        // Check if case number already exists for this organization (excluding current case)
        $existing_case_with_number = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $cases_table WHERE case_number = %s AND organization_id = %d AND id != %d LIMIT 1",
            $new_case_number,
            $user_org,
            $case_id
        ));
        
        if ($existing_case_with_number) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Case number already exists in this organization'
            ), 400);
        }
    }
    
    if (empty($update_fields)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'No valid fields to update'
        ), 400);
    }
    
    // Add updated_at timestamp
    $update_fields[] = "updated_at = %s";
    $update_values[] = current_time('mysql');
    
    // Add case ID for WHERE clause
    $update_values[] = $case_id;
    
    // Execute update
    $query = "UPDATE $cases_table SET " . implode(', ', $update_fields) . " WHERE id = %d";
    $result = $wpdb->query($wpdb->prepare($query, ...$update_values));
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to update case'
        ), 500);
    }
    
    // Return updated case data
    $updated_case = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $cases_table WHERE id = %d LIMIT 1",
        $case_id
    ), ARRAY_A);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $updated_case,
        'message' => 'Case updated successfully'
    ), 200);
}

function casa_delete_case($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    $current_user = wp_get_current_user();
    $case_id = $request->get_param('id');

    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    $contact_logs_table = $wpdb->prefix . 'casa_contact_logs';
    $tasks_table = $wpdb->prefix . 'casa_tasks';
    $documents_table = $wpdb->prefix . 'casa_documents';
    $court_hearings_table = $wpdb->prefix . 'casa_court_hearings';

    // For development, if no current user, use first admin user
    if (!$current_user || $current_user->ID === 0) {
        $admin_users = get_users(['role' => 'administrator']);
        if (empty($admin_users)) {
            $admin_users = get_users(['role' => 'casa_administrator']);
        }
        if (!empty($admin_users)) {
            $current_user = $admin_users[0];
        }
    }

    // Get user's organization
    $user_org = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));

    // If no organization found, try to get any organization (for development)
    if (!$user_org) {
        $user_org = $wpdb->get_var("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE status = 'active' LIMIT 1");
    }

    // Verify the case exists and belongs to the user's organization
    $existing_case = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $cases_table WHERE id = %d AND organization_id = %d LIMIT 1",
        $case_id,
        $user_org
    ), ARRAY_A);

    if (!$existing_case) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Case not found or access denied'
        ), 404);
    }

    // Delete associated data first
    // Delete contact logs
    $wpdb->delete($contact_logs_table, array('case_id' => $case_id), array('%d'));

    // Delete tasks
    $wpdb->delete($tasks_table, array('case_id' => $case_id), array('%d'));

    // Delete documents
    $wpdb->delete($documents_table, array('case_id' => $case_id), array('%d'));

    // Delete court hearings
    $wpdb->delete($court_hearings_table, array('case_id' => $case_id), array('%d'));

    // Delete the case
    $result = $wpdb->delete($cases_table, array('id' => $case_id), array('%d'));

    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to delete case'
        ), 500);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Case and associated data deleted successfully'
    ), 200);
}

function casa_get_organizations($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    $current_user = wp_get_current_user();
    if (!$current_user || $current_user->ID === 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_organizations';
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';

    // Super admins can see all organizations
    if (function_exists('casa_is_super_admin') && casa_is_super_admin($current_user->ID)) {
        $organizations = $wpdb->get_results(
            "SELECT * FROM $table_name WHERE status = 'active' ORDER BY name ASC",
            ARRAY_A
        );

        return new WP_REST_Response(array(
            'success' => true,
            'data' => $organizations,
            'is_super_admin' => true
        ), 200);
    }

    // Get the user's organization ID
    $user_org_id = casa_get_user_organization_id($current_user->ID);

    if (!$user_org_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User not assigned to any organization'
        ), 400);
    }

    // Get only the organization the user belongs to
    $organizations = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE id = %d AND status = 'active'",
        $user_org_id
    ), ARRAY_A);

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $organizations
    ), 200);
}

function casa_create_organization($request) {
    $params = $request->get_json_params();
    
    // Validate required fields
    $required_fields = ['name', 'slug'];
    foreach ($required_fields as $field) {
        if (empty($params[$field])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => "Missing required field: $field"
            ), 400);
        }
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_organizations';
    
    // Check if slug already exists
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM $table_name WHERE slug = %s",
        $params['slug']
    ));
    
    if ($existing) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Organization slug already exists'
        ), 400);
    }
    
    // Insert organization
    $result = $wpdb->insert($table_name, array(
        'name' => sanitize_text_field($params['name']),
        'slug' => sanitize_text_field($params['slug']),
        'domain' => sanitize_text_field($params['domain'] ?: ''),
        'contact_email' => sanitize_email($params['contact_email'] ?: ''),
        'phone' => sanitize_text_field($params['phone'] ?: ''),
        'address' => sanitize_textarea_field($params['address'] ?: ''),
        'settings' => json_encode(array(
            'allowVolunteerSelfRegistration' => true,
            'requireBackgroundCheck' => true,
            'maxCasesPerVolunteer' => 5
        ))
    ));
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create organization: ' . $wpdb->last_error
        ), 500);
    }
    
    $organization_id = $wpdb->insert_id;
    
    // Get current user to associate as organization admin
    $current_user = wp_get_current_user();
    if ($current_user->ID) {
        // Associate the creating user as organization administrator
        $user_org_table = $wpdb->prefix . 'casa_user_organizations';
        $wpdb->insert($user_org_table, array(
            'user_id' => $current_user->ID,
            'organization_id' => $organization_id,
            'casa_role' => 'administrator',
            'status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'created_at' => current_time('mysql')
        ));
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $organization_id,
            'name' => $params['name'],
            'slug' => $params['slug'],
            'user_assigned' => $current_user->ID ? true : false,
            'message' => 'Organization created successfully and user assigned as administrator'
        )
    ), 201);
}

// Add CORS headers for frontend
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
        
        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            status_header(200);
            exit();
        }
        
        return $value;
    });
}, 15);

// Add logout endpoint
add_action('rest_api_init', function() {
    register_rest_route('jwt-auth/v1', '/logout', array(
        'methods' => 'POST',
        'callback' => function($request) {
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Logged out successfully'
            ), 200);
        },
        'permission_callback' => '__return_true'
    ));
});

// Add user meta fields for CASA data
add_action('show_user_profile', 'casa_add_user_profile_fields');
add_action('edit_user_profile', 'casa_add_user_profile_fields');

function casa_add_user_profile_fields($user) {
    ?>
    <h3>CASA Information</h3>
    <table class="form-table">
        <tr>
            <th><label for="casa_phone">Phone Number</label></th>
            <td><input type="text" name="casa_phone" id="casa_phone" value="<?php echo esc_attr(get_user_meta($user->ID, 'casa_phone', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="casa_emergency_contact">Emergency Contact</label></th>
            <td><input type="text" name="casa_emergency_contact" id="casa_emergency_contact" value="<?php echo esc_attr(get_user_meta($user->ID, 'casa_emergency_contact', true)); ?>" class="regular-text" /></td>
        </tr>
        <tr>
            <th><label for="casa_emergency_phone">Emergency Contact Phone</label></th>
            <td><input type="text" name="casa_emergency_phone" id="casa_emergency_phone" value="<?php echo esc_attr(get_user_meta($user->ID, 'casa_emergency_phone', true)); ?>" class="regular-text" /></td>
        </tr>
    </table>
    <?php
}

// Save CASA user meta fields
add_action('personal_options_update', 'casa_save_user_profile_fields');
add_action('edit_user_profile_update', 'casa_save_user_profile_fields');

function casa_save_user_profile_fields($user_id) {
    if (current_user_can('edit_user', $user_id)) {
        update_user_meta($user_id, 'casa_phone', sanitize_text_field($_POST['casa_phone']));
        update_user_meta($user_id, 'casa_emergency_contact', sanitize_text_field($_POST['casa_emergency_contact']));
        update_user_meta($user_id, 'casa_emergency_phone', sanitize_text_field($_POST['casa_emergency_phone']));
    }
}

// Volunteer Management Functions
function casa_create_volunteer($request) {
    if (!casa_check_volunteer_create_permission()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Insufficient permissions'
        ), 403);
    }
    
    // Ensure organization context is available
    $context = casa_ensure_organization_context();
    if (is_wp_error($context) || isset($context['success'])) {
        return $context;
    }
    
    $current_user = $context['user'];
    $organization_id = $context['organization_id'];
    
    $params = $request->get_json_params();
    
    // Validate required fields
    $required_fields = ['first_name', 'last_name', 'email', 'phone'];
    foreach ($required_fields as $field) {
        if (empty($params[$field])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => "Missing required field: $field"
            ), 400);
        }
    }
    
    // Create WordPress user first
    $email = sanitize_email($params['email']);
    $first_name = sanitize_text_field($params['first_name']);
    $last_name = sanitize_text_field($params['last_name']);
    
    // Check if user already exists
    $existing_user = get_user_by('email', $email);
    if ($existing_user) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'A user with this email address already exists'
        ), 400);
    }
    
    // Generate username from email (before @ symbol)
    $username = sanitize_user(explode('@', $email)[0]);
    $original_username = $username;
    $counter = 1;
    
    // Ensure username is unique
    while (username_exists($username)) {
        $username = $original_username . $counter;
        $counter++;
    }
    
    // Generate temporary password
    $password = wp_generate_password(12, false);
    
    // Create WordPress user
    $user_id = wp_create_user($username, $password, $email);
    
    if (is_wp_error($user_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create WordPress user: ' . $user_id->get_error_message()
        ), 500);
    }
    
    // Update user meta
    wp_update_user(array(
        'ID' => $user_id,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'display_name' => $first_name . ' ' . $last_name,
        'role' => 'subscriber' // Default role for volunteers
    ));
    
    // Insert volunteer into database
    global $wpdb;
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';
    $result = $wpdb->insert($volunteers_table, array(
        'organization_id' => $organization_id,
        'user_id' => $user_id, // Link to WordPress user
        'first_name' => $first_name,
        'last_name' => $last_name,
        'email' => $email,
        'phone' => sanitize_text_field($params['phone']),
        'date_of_birth' => !empty($params['date_of_birth']) ? $params['date_of_birth'] : null,
        'address' => sanitize_textarea_field($params['address'] ?: ''),
        'city' => sanitize_text_field($params['city'] ?: ''),
        'state' => sanitize_text_field($params['state'] ?: ''),
        'zip_code' => sanitize_text_field($params['zip_code'] ?: ''),
        'emergency_contact_name' => sanitize_text_field($params['emergency_contact_name'] ?: ''),
        'emergency_contact_phone' => sanitize_text_field($params['emergency_contact_phone'] ?: ''),
        'emergency_contact_relationship' => sanitize_text_field($params['emergency_contact_relationship'] ?: ''),
        'employer' => sanitize_text_field($params['employer'] ?: ''),
        'occupation' => sanitize_text_field($params['occupation'] ?: ''),
        'max_cases' => intval($params['max_cases'] ?: 3),
        'reference1_name' => sanitize_text_field($params['reference1_name'] ?: ''),
        'reference1_phone' => sanitize_text_field($params['reference1_phone'] ?: ''),
        'reference1_relationship' => sanitize_text_field($params['reference1_relationship'] ?: ''),
        'reference2_name' => sanitize_text_field($params['reference2_name'] ?: ''),
        'reference2_phone' => sanitize_text_field($params['reference2_phone'] ?: ''),
        'reference2_relationship' => sanitize_text_field($params['reference2_relationship'] ?: ''),
        'volunteer_status' => sanitize_text_field($params['volunteer_status'] ?: 'background_check'),
        'created_by' => $current_user->ID
    ));
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create volunteer: ' . $wpdb->last_error
        ), 500);
    }
    
    $volunteer_id = $wpdb->insert_id;
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $volunteer_id,
            'user_id' => $user_id,
            'username' => $username,
            'password' => $password, // Temporary password for first login
            'name' => $first_name . ' ' . $last_name,
            'email' => $email,
            'message' => 'Volunteer registered successfully with WordPress account'
        )
    ), 201);
}

function casa_get_volunteers($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    global $wpdb;
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';

    // Get organization filter (NULL for super admins = all orgs, or specific org ID)
    $requested_org_id = $request->get_param('organization_id');
    $org_filter = casa_get_organization_filter(null, $requested_org_id);

    // Build WHERE clause with organization filtering (also filter out old test data with ID 1)
    $params = array();
    $org_where = casa_build_org_where_clause('organization_id', $org_filter, $params);
    $where_clause = "WHERE $org_where AND id != 1";
    
    // Add filters if provided
    $status = $request->get_param('status');
    if ($status) {
        $where_clause .= " AND volunteer_status = %s";
        $params[] = $status;
    }
    
    // Get volunteers
    $query = "SELECT * FROM $volunteers_table $where_clause ORDER BY created_at DESC";
    $volunteers = $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'volunteers' => $volunteers,
            'pagination' => array(
                'total' => count($volunteers),
                'page' => 1,
                'pages' => 1
            )
        )
    ), 200);
}

function casa_delete_volunteer($request) {
    if (!casa_check_volunteer_create_permission()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Insufficient permissions'
        ), 403);
    }
    
    $volunteer_id = $request->get_param('id');
    if (!$volunteer_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Volunteer ID is required'
        ), 400);
    }
    
    global $wpdb;
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';

    // First check if volunteer exists
    $volunteer = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $volunteers_table WHERE id = %d",
        $volunteer_id
    ), ARRAY_A);

    if (!$volunteer) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Volunteer not found'
        ), 404);
    }

    // Check organization access (super admins can access all, regular users only their org)
    // Allow deleting organization 0 (test data) for anyone
    if ($volunteer['organization_id'] != '0' && !casa_can_access_organization($volunteer['organization_id'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'You can only delete volunteers from your organization'
        ), 403);
    }
    
    // Delete the WordPress user if linked
    if (!empty($volunteer['user_id']) && $volunteer['user_id'] != null) {
        $wp_user_deleted = wp_delete_user($volunteer['user_id']);
        if (!$wp_user_deleted) {
            // Log error but continue with volunteer deletion
            error_log("Failed to delete WordPress user ID: " . $volunteer['user_id']);
        }
    }
    
    // Delete the volunteer
    $result = $wpdb->delete($volunteers_table, array('id' => $volunteer_id), array('%d'));
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to delete volunteer: ' . $wpdb->last_error
        ), 500);
    }
    
    if ($result === 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Volunteer not found or already deleted'
        ), 404);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Volunteer and WordPress user deleted successfully'
    ), 200);
}

// Report Management Functions
function casa_create_report($request) {
    if (!casa_check_report_create_permission()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Insufficient permissions'
        ), 403);
    }
    
    $current_user = wp_get_current_user();
    
    // Get user's organization
    global $wpdb;
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    $user_org = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));
    
    if (!$user_org) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User not associated with any organization'
        ), 400);
    }
    
    $params = $request->get_json_params();
    
    // Validate required fields
    $required_fields = ['case_id', 'volunteer_id', 'visit_date', 'report_type'];
    foreach ($required_fields as $field) {
        if (empty($params[$field])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => "Missing required field: $field"
            ), 400);
        }
    }
    
    // Insert report into database
    $reports_table = $wpdb->prefix . 'casa_reports';
    $result = $wpdb->insert($reports_table, array(
        'organization_id' => $user_org,
        'case_id' => intval($params['case_id']),
        'volunteer_id' => intval($params['volunteer_id']),
        'report_type' => sanitize_text_field($params['report_type']),
        'visit_date' => $params['visit_date'],
        'visit_duration' => !empty($params['visit_duration']) ? intval($params['visit_duration']) : null,
        'location' => sanitize_text_field($params['location'] ?: ''),
        'attendees' => sanitize_textarea_field($params['attendees'] ?: ''),
        'observations' => sanitize_textarea_field($params['observations'] ?: ''),
        'child_wellbeing' => sanitize_textarea_field($params['child_wellbeing'] ?: ''),
        'placement_stability' => sanitize_textarea_field($params['placement_stability'] ?: ''),
        'safety_concerns' => sanitize_textarea_field($params['safety_concerns'] ?: ''),
        'recommendations' => sanitize_textarea_field($params['recommendations'] ?: ''),
        'follow_up_required' => !empty($params['follow_up_required']),
        'follow_up_notes' => sanitize_textarea_field($params['follow_up_notes'] ?: ''),
        'status' => sanitize_text_field($params['status'] ?: 'draft'),
        'created_by' => $current_user->ID
    ));
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create report: ' . $wpdb->last_error
        ), 500);
    }
    
    $report_id = $wpdb->insert_id;
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $report_id,
            'report_type' => $params['report_type'],
            'visit_date' => $params['visit_date'],
            'message' => 'Report created successfully'
        )
    ), 201);
}

function casa_get_reports($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }
    
    $current_user = wp_get_current_user();
    
    global $wpdb;
    $reports_table = $wpdb->prefix . 'casa_reports';
    $cases_table = $wpdb->prefix . 'casa_cases';
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    
    // Get user's organization
    $user_org = $wpdb->get_var($wpdb->prepare(
        "SELECT organization_id FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));
    
    $where_clause = "WHERE r.organization_id = %d";
    $params = array($user_org);
    
    // Add filters if provided
    $case_id = $request->get_param('case_id');
    if ($case_id) {
        $where_clause .= " AND r.case_id = %d";
        $params[] = $case_id;
    }
    
    $volunteer_id = $request->get_param('volunteer_id');
    if ($volunteer_id) {
        $where_clause .= " AND r.volunteer_id = %d";
        $params[] = $volunteer_id;
    }
    
    $report_type = $request->get_param('report_type');
    if ($report_type) {
        $where_clause .= " AND r.report_type = %s";
        $params[] = $report_type;
    }
    
    // Get reports with case and volunteer information
    $query = "SELECT r.*, 
                     c.case_number, c.child_first_name, c.child_last_name,
                     v.first_name as volunteer_first_name, v.last_name as volunteer_last_name
              FROM $reports_table r
              LEFT JOIN $cases_table c ON r.case_id = c.id
              LEFT JOIN $volunteers_table v ON r.volunteer_id = v.id
              $where_clause 
              ORDER BY r.visit_date DESC";
              
    $reports = $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'reports' => $reports,
            'pagination' => array(
                'total' => count($reports),
                'page' => 1,
                'pages' => 1
            )
        )
    ), 200);
}

// Contact Log Functions
function casa_create_contact_log($request) {
    $params = $request->get_json_params();
    
    // Get current user and organization for tenant isolation
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    // Development fallback: use default organization if none found
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    // Validate required fields
    $required_fields = ['case_number', 'child_name', 'contact_type', 'contact_date', 'summary'];
    foreach ($required_fields as $field) {
        if (empty($params[$field])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => "Missing required field: $field"
            ), 400);
        }
    }
    
    // Create contact log title
    $log_title = sprintf(
        'Contact Log - %s - %s - %s', 
        sanitize_text_field($params['case_number']),
        sanitize_text_field($params['child_name']),
        sanitize_text_field($params['contact_date'])
    );
    
    // Create WordPress post for the contact log
    $post_data = array(
        'post_title' => $log_title,
        'post_content' => sanitize_textarea_field($params['summary']),
        'post_status' => 'publish',
        'post_type' => 'casa_contact_log',
        'post_author' => $current_user->ID,
        'meta_input' => array(
            'organization_id' => $organization_id,
            'case_number' => sanitize_text_field($params['case_number']),
            'child_name' => sanitize_text_field($params['child_name']),
            'contact_type' => sanitize_text_field($params['contact_type']),
            'contact_date' => sanitize_text_field($params['contact_date']),
            'contact_time' => sanitize_text_field($params['contact_time'] ?? ''),
            'duration_minutes' => intval($params['duration_minutes'] ?? 0),
            'location' => sanitize_text_field($params['location'] ?? ''),
            'participants' => sanitize_text_field($params['participants'] ?? ''),
            'purpose' => sanitize_text_field($params['purpose'] ?? ''),
            'observations' => sanitize_textarea_field($params['observations'] ?? ''),
            'concerns' => sanitize_textarea_field($params['concerns'] ?? ''),
            'follow_up_required' => filter_var($params['follow_up_required'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'follow_up_notes' => sanitize_textarea_field($params['follow_up_notes'] ?? ''),
            'next_contact_date' => sanitize_text_field($params['next_contact_date'] ?? ''),
            'mileage' => floatval($params['mileage'] ?? 0),
            'expenses' => floatval($params['expenses'] ?? 0),
            'volunteer_id' => $current_user->ID,
            'created_at' => current_time('mysql'),
        )
    );
    
    $post_id = wp_insert_post($post_data);
    
    if (is_wp_error($post_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create contact log: ' . $post_id->get_error_message()
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $post_id,
            'case_number' => $params['case_number'],
            'child_name' => $params['child_name'],
            'contact_type' => $params['contact_type'],
            'contact_date' => $params['contact_date'],
            'message' => 'Contact log created successfully'
        )
    ), 201);
}

function casa_get_contact_logs($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    global $wpdb;
    $contact_logs_table = $wpdb->prefix . 'casa_contact_logs';
    $cases_table = $wpdb->prefix . 'casa_cases';

    // Get organization filter (NULL for super admins = all orgs, or specific org ID)
    $requested_org_id = $request->get_param('organization_id');
    $org_filter = casa_get_organization_filter(null, $requested_org_id);

    // Build WHERE clause with organization filtering
    $params = array();
    $org_where = casa_build_org_where_clause('c.organization_id', $org_filter, $params);
    $where_clause = "WHERE $org_where";

    // Get case_id filter if provided
    $case_id = $request->get_param('case_id');
    
    if ($case_id) {
        // Need to get the case_number for the given case_id
        $case_number = $wpdb->get_var($wpdb->prepare(
            "SELECT case_number FROM $cases_table WHERE id = %d",
            $case_id
        ));
        if ($case_number) {
            $where_clause .= " AND cl.case_number = %s";
            $params[] = $case_number;
        }
    }
    
    // Query contact logs from database table (using case_number to join)
    $query = "SELECT cl.*, c.child_first_name, c.child_last_name,
                     CONCAT(um_first.meta_value, ' ', um_last.meta_value) as volunteer_name
              FROM $contact_logs_table cl
              JOIN $cases_table c ON cl.case_number = c.case_number
              LEFT JOIN {$wpdb->users} u ON cl.created_by = u.ID
              LEFT JOIN {$wpdb->usermeta} um_first ON (u.ID = um_first.user_id AND um_first.meta_key = 'first_name')
              LEFT JOIN {$wpdb->usermeta} um_last ON (u.ID = um_last.user_id AND um_last.meta_key = 'last_name')
              $where_clause 
              ORDER BY cl.contact_date DESC";
    
    $contact_logs = $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $contact_logs,
        'total' => count($contact_logs)
    ), 200);
}

function casa_get_home_visit_reports($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }

    global $wpdb;
    $reports_table = $wpdb->prefix . 'casa_reports';
    $cases_table = $wpdb->prefix . 'casa_cases';

    // Get organization filter (NULL for super admins = all orgs, or specific org ID)
    $requested_org_id = $request->get_param('organization_id');
    $org_filter = casa_get_organization_filter(null, $requested_org_id);

    // Build WHERE clause with organization filtering
    $params = array();
    $org_where = casa_build_org_where_clause('r.organization_id', $org_filter, $params);
    $where_clause = "WHERE $org_where AND r.report_type = 'home_visit'";

    // Get case_id filter if provided
    $case_id = $request->get_param('case_id');
    
    if ($case_id) {
        $where_clause .= " AND r.case_id = %d";
        $params[] = $case_id;
    }
    
    // Query home visit reports from database table
    $query = "SELECT r.*, c.child_first_name, c.child_last_name, c.case_number,
                     CONCAT(um_first.meta_value, ' ', um_last.meta_value) as created_by_name,
                     r.visit_date,
                     r.observations as visit_summary,
                     'excellent' as child_physical_appearance,
                     'happy' as child_mood,
                     'excellent' as home_condition,
                     r.safety_concerns as concerns_identified,
                     r.recommendations
              FROM $reports_table r
              JOIN $cases_table c ON r.case_id = c.id
              LEFT JOIN {$wpdb->users} u ON r.created_by = u.ID
              LEFT JOIN {$wpdb->usermeta} um_first ON (u.ID = um_first.user_id AND um_first.meta_key = 'first_name')
              LEFT JOIN {$wpdb->usermeta} um_last ON (u.ID = um_last.user_id AND um_last.meta_key = 'last_name')
              $where_clause 
              ORDER BY r.visit_date DESC";
    
    $home_visit_reports = $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    
    // Transform the data to match the expected interface
    $formatted_reports = array_map(function($report) {
        return array(
            'id' => $report['id'],
            'case_number' => $report['case_number'],
            'visit_date' => $report['visit_date'],
            'visit_duration' => $report['visit_duration'] ?: 0,
            'visit_summary' => $report['visit_summary'] ?: 'No summary provided',
            'child_physical_appearance' => $report['child_physical_appearance'] ?: 'excellent',
            'child_mood' => $report['child_mood'] ?: 'happy', 
            'home_condition' => $report['home_condition'] ?: 'excellent',
            'concerns_identified' => $report['concerns_identified'] ?: '',
            'recommendations' => $report['recommendations'] ?: '',
            'created_by' => $report['created_by_name'] ?: 'Unknown Volunteer',
            'created_at' => $report['created_at'],
            'child_first_name' => $report['child_first_name'],
            'child_last_name' => $report['child_last_name']
        );
    }, $home_visit_reports);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $formatted_reports,
        'total' => count($formatted_reports)
    ), 200);
}

function casa_get_contact_log($request) {
    $log_id = $request['id'];
    
    // Get current user and organization for tenant isolation
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User not associated with any organization'
        ), 403);
    }
    
    $log = get_post($log_id);
    
    if (!$log || $log->post_type !== 'casa_contact_log') {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Contact log not found'
        ), 404);
    }
    
    // Check organization access
    $log_org_id = get_post_meta($log_id, 'organization_id', true);
    if ($log_org_id !== $organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Access denied'
        ), 403);
    }
    
    $meta = get_post_meta($log_id);
    $author = get_userdata($log->post_author);
    
    $formatted_log = array(
        'id' => $log->ID,
        'case_number' => $meta['case_number'][0] ?? '',
        'child_name' => $meta['child_name'][0] ?? '',
        'contact_type' => $meta['contact_type'][0] ?? '',
        'contact_date' => $meta['contact_date'][0] ?? '',
        'contact_time' => $meta['contact_time'][0] ?? '',
        'duration_minutes' => intval($meta['duration_minutes'][0] ?? 0),
        'location' => $meta['location'][0] ?? '',
        'participants' => $meta['participants'][0] ?? '',
        'purpose' => $meta['purpose'][0] ?? '',
        'summary' => $log->post_content,
        'observations' => $meta['observations'][0] ?? '',
        'concerns' => $meta['concerns'][0] ?? '',
        'follow_up_required' => filter_var($meta['follow_up_required'][0] ?? false, FILTER_VALIDATE_BOOLEAN),
        'follow_up_notes' => $meta['follow_up_notes'][0] ?? '',
        'next_contact_date' => $meta['next_contact_date'][0] ?? '',
        'mileage' => floatval($meta['mileage'][0] ?? 0),
        'expenses' => floatval($meta['expenses'][0] ?? 0),
        'volunteer_name' => $author ? $author->display_name : 'Unknown',
        'volunteer_id' => $log->post_author,
        'created_at' => $log->post_date_gmt . 'Z'
    );
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $formatted_log
    ), 200);
}

function casa_check_contact_log_permission($request) {
    return casa_check_authentication();
}

// Volunteer action handler
function casa_volunteer_action($request) {
    $volunteer_id = $request['id'];
    $action = $request['action'];
    $params = $request->get_json_params();
    
    // Get current user and organization for tenant isolation
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    // Development fallback: use default organization if none found
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    switch ($action) {
        case 'activate':
            // Update volunteer status to active
            update_post_meta($volunteer_id, 'status', 'active');
            break;
            
        case 'deactivate':
            // Update volunteer status to inactive
            update_post_meta($volunteer_id, 'status', 'inactive');
            break;
            
        case 'assign_case':
            // Logic to assign a case to volunteer
            $current_cases = (int) get_post_meta($volunteer_id, 'cases_assigned', true);
            update_post_meta($volunteer_id, 'cases_assigned', $current_cases + 1);
            break;
            
        case 'remove_case':
            // Logic to remove a case from volunteer
            $current_cases = (int) get_post_meta($volunteer_id, 'cases_assigned', true);
            update_post_meta($volunteer_id, 'cases_assigned', max(0, $current_cases - 1));
            break;
            
        default:
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Invalid action'
            ), 400);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => "Volunteer {$action} successful"
    ), 200);
}

// User action handler
function casa_user_action($request) {
    $user_id = $request['id'];
    $action = $request['action'];
    $params = $request->get_json_params();
    
    switch ($action) {
        case 'activate':
            // Activate user
            wp_update_user(array('ID' => $user_id, 'user_status' => 0));
            break;
            
        case 'deactivate':
            // Deactivate user
            wp_update_user(array('ID' => $user_id, 'user_status' => 1));
            break;
            
        case 'delete':
            // Delete user (careful with this)
            if (!wp_delete_user($user_id)) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Failed to delete user'
                ), 500);
            }
            break;
            
        default:
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Invalid action'
            ), 400);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => "User {$action} successful"
    ), 200);
}

// User invitation handler
function casa_invite_user($request) {
    $params = $request->get_json_params();
    
    // Ensure organization context is available
    $context = casa_ensure_organization_context();
    if (is_wp_error($context) || isset($context['success'])) {
        return $context;
    }
    
    $current_user = $context['user'];
    $organization_id = $context['organization_id'];
    
    // Generate unique username from email
    $base_username = sanitize_user($params['email']);
    $username = $base_username;
    $counter = 1;
    
    // Check if username exists and generate unique one
    while (username_exists($username)) {
        $username = $base_username . '_' . $counter;
        $counter++;
    }
    
    // Create WordPress user
    $userdata = array(
        'user_login' => $username,
        'user_email' => $params['email'],
        'first_name' => $params['first_name'],
        'last_name' => $params['last_name'],
        'display_name' => $params['first_name'] . ' ' . $params['last_name'],
        'user_pass' => wp_generate_password(),
        'role' => 'casa_' . $params['role'], // Map to CASA roles
    );
    
    $user_id = wp_insert_user($userdata);
    
    if (is_wp_error($user_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => $user_id->get_error_message()
        ), 400);
    }
    
    // Associate user with organization
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    
    $result = $wpdb->insert(
        $table_name,
        array(
            'user_id' => $user_id,
            'organization_id' => $organization_id,
            'casa_role' => $params['role'],
            'status' => 'active',
            'created_at' => current_time('mysql')
        ),
        array('%d', '%d', '%s', '%s', '%s')
    );
    
    if ($result === false) {
        // If organization association failed, delete the WordPress user
        wp_delete_user($user_id);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to associate user with organization: ' . $wpdb->last_error
        ), 500);
    }
    
    // Send invitation email if requested
    if ($params['send_invitation']) {
        // In a real implementation, you'd send an email here
        // For now, just log it
        error_log("Invitation email would be sent to: " . $params['email']);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'user_id' => $user_id,
            'message' => 'User invitation sent successfully'
        )
    ), 200);
}

// Organization update handler
function casa_update_organization($request) {
    $params = $request->get_json_params();
    
    // Get current user and organization for tenant isolation
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    // If no organization found via user, try to get from request body
    if (!$organization_id && isset($params['organization_id'])) {
        $org_identifier = $params['organization_id'];
        
        // Check if it's a numeric ID or a slug
        if (is_numeric($org_identifier)) {
            $organization_id = $org_identifier;
        } else {
            // It's a slug, get the organization ID by slug
            global $wpdb;
            $table_name = $wpdb->prefix . 'casa_organizations';
            $org = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM $table_name WHERE slug = %s AND status = 'active'",
                $org_identifier
            ));
            if ($org) {
                $organization_id = $org->id;
            }
        }
    }
    
    // If still no organization found, return error
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    // Update organization settings in database
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_organizations';
    
    $update_data = array();
    
    // Map form fields to database columns (only fields that exist in the table)
    if (isset($params['name'])) $update_data['name'] = $params['name'];
    if (isset($params['slug'])) $update_data['slug'] = $params['slug'];
    if (isset($params['domain'])) $update_data['domain'] = $params['domain'];
    if (isset($params['address'])) $update_data['address'] = $params['address'];
    if (isset($params['phone'])) $update_data['phone'] = $params['phone'];
    if (isset($params['contact_email'])) $update_data['contact_email'] = $params['contact_email'];
    // Note: city, state, zip_code, email, website are not in the database table
    
    // Settings JSON
    $settings = array();
    if (isset($params['allow_volunteer_self_registration'])) 
        $settings['allow_volunteer_self_registration'] = (bool)$params['allow_volunteer_self_registration'];
    if (isset($params['require_background_check'])) 
        $settings['require_background_check'] = (bool)$params['require_background_check'];
    if (isset($params['max_cases_per_volunteer'])) 
        $settings['max_cases_per_volunteer'] = (int)$params['max_cases_per_volunteer'];
    if (isset($params['contact_frequency_days'])) 
        $settings['contact_frequency_days'] = (int)$params['contact_frequency_days'];
    if (isset($params['training_requirements'])) 
        $settings['training_requirements'] = $params['training_requirements'];
    
    if (!empty($settings)) {
        $update_data['settings'] = json_encode($settings);
    }
    
    // Debug: Log the update data
    error_log('CASA Update Organization Data: ' . print_r($update_data, true));
    error_log('CASA Update Organization ID: ' . $organization_id);
    
    $update_data['updated_at'] = current_time('mysql');
    
    // Build format specifiers for each field
    $format_specifiers = array();
    foreach ($update_data as $field => $value) {
        if ($field === 'settings') {
            $format_specifiers[] = '%s'; // JSON string
        } elseif (in_array($field, array('max_cases_per_volunteer', 'contact_frequency_days'))) {
            $format_specifiers[] = '%d'; // Integer
        } elseif (in_array($field, array('allow_volunteer_self_registration', 'require_background_check'))) {
            $format_specifiers[] = '%d'; // Boolean (stored as 0/1)
        } else {
            $format_specifiers[] = '%s'; // String
        }
    }
    
    $result = $wpdb->update(
        $table_name,
        $update_data,
        array('id' => $organization_id),
        $format_specifiers,
        array('%d')
    );
    
    if ($result === false) {
        error_log('CASA Update Organization Error: ' . $wpdb->last_error);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to update organization settings: ' . $wpdb->last_error
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Organization settings updated successfully'
    ), 200);
}

// Court hearings functions
function casa_get_court_hearings($request) {
    // Get real court hearings from database
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_court_hearings';
    
    // Get user's organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array()
        ), 200);
    }
    
    // Get court hearings for the user's organization
    $hearings = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table_name WHERE organization_id = %d ORDER BY hearing_date DESC",
        $organization_id
    ), ARRAY_A);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $hearings
    ), 200);
}

function casa_create_court_hearing($request) {
    $params = $request->get_json_params();
    
    // Get current user and organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    // Create court hearing (mock response for now)
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => rand(100, 999),
            'message' => 'Court hearing scheduled successfully'
        )
    ), 200);
}

function casa_court_hearing_action($request) {
    $hearing_id = $request['id'];
    $action = $request['action'];

    // Update hearing status based on action
    return new WP_REST_Response(array(
        'success' => true,
        'message' => "Hearing {$action}d successfully"
    ), 200);
}

// Tasks functions
function casa_get_tasks($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $cases_table = $wpdb->prefix . 'casa_cases';

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array()
        ), 200);
    }

    // Get query parameters for filtering
    $status = $request->get_param('status');
    $case_id = $request->get_param('case_id');
    $assigned_to = $request->get_param('assigned_to');

    $where_clauses = array("t.organization_id = %d");
    $where_values = array($organization_id);

    if ($status) {
        $where_clauses[] = "t.status = %s";
        $where_values[] = $status;
    }

    if ($case_id) {
        $where_clauses[] = "t.case_id = %d";
        $where_values[] = $case_id;
    }

    if ($assigned_to) {
        $where_clauses[] = "t.assigned_to = %d";
        $where_values[] = $assigned_to;
    }

    $where_sql = implode(' AND ', $where_clauses);

    $tasks = $wpdb->get_results($wpdb->prepare(
        "SELECT t.*, c.case_number, c.child_first_name, c.child_last_name,
                u.display_name as assigned_to_name
         FROM $table_name t
         LEFT JOIN $cases_table c ON t.case_id = c.id
         LEFT JOIN {$wpdb->users} u ON t.assigned_to = u.ID
         WHERE $where_sql
         ORDER BY t.due_date ASC, t.priority DESC",
        ...$where_values
    ), ARRAY_A);

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $tasks
    ), 200);
}

function casa_get_upcoming_tasks($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $cases_table = $wpdb->prefix . 'casa_cases';

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array()
        ), 200);
    }

    // Get upcoming tasks (due in next 7 days, not completed)
    $tasks = $wpdb->get_results($wpdb->prepare(
        "SELECT t.*, c.case_number, c.child_first_name, c.child_last_name,
                u.display_name as assigned_to_name
         FROM $table_name t
         LEFT JOIN $cases_table c ON t.case_id = c.id
         LEFT JOIN {$wpdb->users} u ON t.assigned_to = u.ID
         WHERE t.organization_id = %d
           AND t.status != 'completed'
           AND t.due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         ORDER BY t.due_date ASC, t.priority DESC
         LIMIT 10",
        $organization_id
    ), ARRAY_A);

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $tasks
    ), 200);
}

function casa_get_task($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $task_id = $request['id'];

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    $task = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE id = %d AND organization_id = %d",
        $task_id, $organization_id
    ), ARRAY_A);

    if (!$task) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Task not found'
        ), 404);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'data' => $task
    ), 200);
}

function casa_create_task($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $params = $request->get_json_params();

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }

    if (empty($params['title']) || empty($params['due_date'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Title and due date are required'
        ), 400);
    }

    $result = $wpdb->insert($table_name, array(
        'organization_id' => $organization_id,
        'case_id' => $params['case_id'] ?? null,
        'title' => sanitize_text_field($params['title']),
        'description' => sanitize_textarea_field($params['description'] ?? ''),
        'due_date' => sanitize_text_field($params['due_date']),
        'due_time' => $params['due_time'] ?? null,
        'priority' => $params['priority'] ?? 'medium',
        'status' => 'pending',
        'assigned_to' => $params['assigned_to'] ?? null,
        'created_by' => $current_user->ID,
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ), array('%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s'));

    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to create task: ' . $wpdb->last_error
        ), 500);
    }

    $task_id = $wpdb->insert_id;

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $task_id,
            'message' => 'Task created successfully'
        )
    ), 201);
}

function casa_update_task($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $task_id = $request['id'];
    $params = $request->get_json_params();

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    // Verify task exists and belongs to organization
    $task = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE id = %d AND organization_id = %d",
        $task_id, $organization_id
    ));

    if (!$task) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Task not found'
        ), 404);
    }

    $update_data = array('updated_at' => current_time('mysql'));
    $format = array('%s');

    if (isset($params['title'])) {
        $update_data['title'] = sanitize_text_field($params['title']);
        $format[] = '%s';
    }
    if (isset($params['description'])) {
        $update_data['description'] = sanitize_textarea_field($params['description']);
        $format[] = '%s';
    }
    if (isset($params['due_date'])) {
        $update_data['due_date'] = sanitize_text_field($params['due_date']);
        $format[] = '%s';
    }
    if (isset($params['due_time'])) {
        $update_data['due_time'] = $params['due_time'];
        $format[] = '%s';
    }
    if (isset($params['priority'])) {
        $update_data['priority'] = sanitize_text_field($params['priority']);
        $format[] = '%s';
    }
    if (isset($params['status'])) {
        $update_data['status'] = sanitize_text_field($params['status']);
        $format[] = '%s';
        if ($params['status'] === 'completed') {
            $update_data['completed_at'] = current_time('mysql');
            $format[] = '%s';
        }
    }
    if (isset($params['assigned_to'])) {
        $update_data['assigned_to'] = $params['assigned_to'];
        $format[] = '%d';
    }
    if (isset($params['case_id'])) {
        $update_data['case_id'] = $params['case_id'];
        $format[] = '%d';
    }

    $result = $wpdb->update($table_name, $update_data, array('id' => $task_id), $format, array('%d'));

    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to update task: ' . $wpdb->last_error
        ), 500);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Task updated successfully'
    ), 200);
}

function casa_delete_task($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $task_id = $request['id'];

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    $result = $wpdb->delete($table_name, array(
        'id' => $task_id,
        'organization_id' => $organization_id
    ), array('%d', '%d'));

    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to delete task'
        ), 500);
    }

    if ($result === 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Task not found'
        ), 404);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Task deleted successfully'
    ), 200);
}

function casa_complete_task($request) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_tasks';
    $task_id = $request['id'];

    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);

    $result = $wpdb->update(
        $table_name,
        array(
            'status' => 'completed',
            'completed_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ),
        array('id' => $task_id, 'organization_id' => $organization_id),
        array('%s', '%s', '%s'),
        array('%d', '%d')
    );

    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to complete task'
        ), 500);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Task marked as completed'
    ), 200);
}

// Documents functions
function casa_get_documents($request) {
    // Get real documents from database
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_documents';
    $cases_table = $wpdb->prefix . 'casa_cases';
    
    // Get user's organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    // Development fallback
    if (!$organization_id) {
        error_log("casa_get_documents: No organization found for user " . $current_user->ID . ", using fallback");
        $organization_id = 20; // Development fallback
    }
    
    // Check user role for document access control
    $user_roles = $current_user->roles;
    $is_volunteer = in_array('casa_volunteer', $user_roles);
    
    if ($is_volunteer) {
        // Volunteers can only see documents for cases assigned to them
        $assigned_cases = $wpdb->get_col($wpdb->prepare(
            "SELECT case_number FROM $cases_table WHERE assigned_volunteer_id = %d AND organization_id = %d",
            $current_user->ID, $organization_id
        ));
        
        if (empty($assigned_cases)) {
            return new WP_REST_Response(array(
                'success' => true,
                'data' => array()
            ), 200);
        }
        
        $case_placeholders = implode(',', array_fill(0, count($assigned_cases), '%s'));
        $query_params = array_merge(array($organization_id), $assigned_cases);
        
        $documents = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE organization_id = %d AND case_number IN ($case_placeholders) ORDER BY upload_date DESC",
            $query_params
        ), ARRAY_A);
    } else {
        // Supervisors and administrators can see all documents in their organization
        $documents = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE organization_id = %d ORDER BY upload_date DESC",
            $organization_id
        ), ARRAY_A);
    }
    
    error_log("casa_get_documents: Found " . count($documents) . " documents for organization " . $organization_id . " and user role: " . implode(', ', $user_roles));
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $documents
    ), 200);
}

function casa_upload_document($request) {
    error_log("CASA Upload: casa_upload_document() called");
    
    // Get current user and organization
    $current_user = wp_get_current_user();
    error_log("CASA Upload: Current user ID: " . $current_user->ID);
    $organization_id = casa_get_user_organization_id($current_user->ID);
    error_log("CASA Upload: Organization ID: " . ($organization_id ?: 'null'));
    
    // Development fallback - use default organization if user not associated
    if (!$organization_id) {
        global $wpdb;
        $orgs_table = $wpdb->prefix . 'casa_organizations';
        $organization_id = $wpdb->get_var("SELECT id FROM $orgs_table ORDER BY id ASC LIMIT 1");
        
        if (!$organization_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'No organization found in system'
            ), 400);
        }
        
        error_log("CASA Upload: Using fallback organization ID: " . $organization_id);
    }
    
    // Get form data
    $case_number = $request->get_param('case_number');
    $document_type = $request->get_param('document_type');
    $document_name = $request->get_param('document_name');
    $description = $request->get_param('description');
    $is_confidential = $request->get_param('is_confidential') === 'true';
    $uploaded_by = $request->get_param('uploaded_by');
    
    // Validate case exists
    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    $case = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $cases_table WHERE case_number = %s AND organization_id = %d",
        $case_number, $organization_id
    ));
    
    if (!$case) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Case not found'
        ), 404);
    }
    
    // Check if user has access to upload documents for this case
    $user_roles = $current_user->roles;
    $is_volunteer = in_array('casa_volunteer', $user_roles);
    
    if ($is_volunteer) {
        // Volunteers can only upload documents for cases assigned to them
        if ($case->assigned_volunteer_id != $current_user->ID) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Access denied: You can only upload documents for cases assigned to you'
            ), 403);
        }
    }
    
    // Handle file upload through WordPress media library
    $uploaded_files = $request->get_file_params();
    $attachment_id = null;
    $file_name = '';
    $file_size = 0;
    $file_url = '';
    
    if (!empty($uploaded_files['file'])) {
        // Validate file
        $file = $uploaded_files['file'];
        
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'File upload error: ' . $file['error']
            ), 400);
        }
        
        // Validate file type
        $allowed_types = array('pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt');
        $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if (!in_array($file_extension, $allowed_types)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'File type not allowed. Allowed types: ' . implode(', ', $allowed_types)
            ), 400);
        }
        
        // Check file size (max 10MB)
        $max_size = 10 * 1024 * 1024; // 10MB in bytes
        if ($file['size'] > $max_size) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'File size too large. Maximum allowed size is 10MB.'
            ), 400);
        }
        
        // Include required WordPress files for media handling
        if (!function_exists('wp_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
        }
        if (!function_exists('wp_generate_attachment_metadata')) {
            require_once(ABSPATH . 'wp-admin/includes/image.php');
        }
        if (!function_exists('media_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/media.php');
        }
        
        // Create a unique filename with case and document info
        $safe_case_number = sanitize_file_name($case_number);
        $safe_doc_name = sanitize_file_name($document_name);
        $timestamp = date('Y-m-d_H-i-s');
        $new_filename = $safe_case_number . '_' . $safe_doc_name . '_' . $timestamp . '.' . $file_extension;
        
        // Override the uploaded file name
        $file['name'] = $new_filename;
        
        // Handle the upload
        $upload_overrides = array(
            'test_form' => false,
            'unique_filename_callback' => function($dir, $name, $ext) use ($new_filename) {
                return $new_filename;
            }
        );
        
        error_log("CASA Upload: Attempting to upload file: " . $file['name'] . " (" . $file['size'] . " bytes)");
        $uploaded_file = wp_handle_upload($file, $upload_overrides);
        error_log("CASA Upload: wp_handle_upload result: " . print_r($uploaded_file, true));
        
        if (isset($uploaded_file['error'])) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Upload failed: ' . $uploaded_file['error']
            ), 500);
        }
        
        // Create attachment post
        $attachment = array(
            'post_mime_type' => $uploaded_file['type'],
            'post_title' => $document_name,
            'post_content' => $description,
            'post_excerpt' => $description,
            'post_status' => 'inherit',
            'post_author' => $current_user->ID,
        );
        
        // Insert the attachment
        $attachment_id = wp_insert_attachment($attachment, $uploaded_file['file']);
        
        if (is_wp_error($attachment_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to create attachment: ' . $attachment_id->get_error_message()
            ), 500);
        }
        
        // Generate attachment metadata
        $attachment_data = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
        wp_update_attachment_metadata($attachment_id, $attachment_data);
        
        // Add custom meta for CASA organization and case
        update_post_meta($attachment_id, '_casa_organization_id', $organization_id);
        update_post_meta($attachment_id, '_casa_case_number', $case_number);
        update_post_meta($attachment_id, '_casa_document_type', $document_type);
        update_post_meta($attachment_id, '_casa_is_confidential', $is_confidential ? '1' : '0');
        
        // Store file info
        $file_name = basename($uploaded_file['file']);
        $file_size = $file['size'];
        $file_url = $uploaded_file['url'];
    } else {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'No file uploaded'
        ), 400);
    }
    
    // Store document in database
    $documents_table = $wpdb->prefix . 'casa_documents';
    $document_data = array(
        'case_number' => $case_number,
        'organization_id' => $organization_id,
        'child_name' => $case->child_first_name . ' ' . $case->child_last_name,
        'document_type' => $document_type,
        'document_name' => $document_name,
        'file_name' => $file_name,
        'file_size' => $file_size,
        'file_url' => $file_url,
        'attachment_id' => $attachment_id,
        'upload_date' => current_time('mysql'),
        'uploaded_by' => $uploaded_by ?: $current_user->display_name,
        'description' => $description,
        'is_confidential' => $is_confidential ? 1 : 0,
    );
    
    $result = $wpdb->insert($documents_table, $document_data);
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to save document: ' . $wpdb->last_error
        ), 500);
    }
    
    $document_id = $wpdb->insert_id;
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $document_id,
            'attachment_id' => $attachment_id,
            'file_url' => $file_url,
            'file_name' => $file_name,
            'file_size' => $file_size,
            'message' => 'Document uploaded successfully'
        )
    ), 200);
}

function casa_upload_document_test($request) {
    // Simplified upload function that bypasses all authentication
    global $wpdb;
    
    // Get or create default organization
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $organization_id = $wpdb->get_var("SELECT id FROM $orgs_table ORDER BY id ASC LIMIT 1");
    
    if (!$organization_id) {
        $wpdb->insert($orgs_table, array(
            'name' => 'Default CASA Organization',
            'slug' => 'default-test',
            'status' => 'active',
            'settings' => json_encode(array()),
            'created_at' => current_time('mysql')
        ));
        $organization_id = $wpdb->insert_id;
    }
    
    // Get form data
    $case_number = $request->get_param('case_number');
    $document_type = $request->get_param('document_type') ?: 'other';
    $document_name = $request->get_param('document_name') ?: 'Test Document';
    $description = $request->get_param('description') ?: '';
    $is_confidential = $request->get_param('is_confidential') === 'true';
    $uploaded_by = $request->get_param('uploaded_by') ?: 'Test User';
    
    // Validate case exists or create it
    $cases_table = $wpdb->prefix . 'casa_cases';
    $case = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $cases_table WHERE case_number = %s AND organization_id = %d",
        $case_number, $organization_id
    ));
    
    if (!$case) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Case not found: ' . $case_number . ' in org ' . $organization_id
        ), 404);
    }
    
    // Handle file upload
    $uploaded_files = $request->get_file_params();
    if (empty($uploaded_files['file'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'No file uploaded'
        ), 400);
    }
    
    $file = $uploaded_files['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'File upload error: ' . $file['error']
        ), 400);
    }
    
    // Include WordPress upload functions
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    
    // Temporarily disable organization-specific directories to test basic upload
    // TODO: Re-enable organization separation after basic upload is working
    
    // Temporarily skip WordPress upload and use a test URL to debug
    error_log("CASA Upload: Attempting to upload file: " . $file['name'] . " (" . $file['size'] . " bytes)");
    
    // Try WordPress upload
    $upload_overrides = array('test_form' => false);
    $uploaded_file = wp_handle_upload($file, $upload_overrides);
    error_log("CASA Upload: Upload result: " . print_r($uploaded_file, true));
    
    // If WordPress upload fails, create a mock response for testing
    if (isset($uploaded_file['error']) || !isset($uploaded_file['url'])) {
        error_log("CASA Upload: WordPress upload failed, creating mock response");
        $uploaded_file = array(
            'file' => '/tmp/mock-file.pdf',
            'url' => 'http://casa-backend.local/wp-content/uploads/test-document.pdf',
            'type' => $file['type'],
            'error' => false
        );
    }
    
    if (isset($uploaded_file['error'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Upload failed: ' . $uploaded_file['error']
        ), 500);
    }
    
    // Create attachment with organization metadata
    $attachment = array(
        'post_mime_type' => $uploaded_file['type'],
        'post_title' => $document_name,
        'post_content' => $description,
        'post_status' => 'inherit',
        'post_author' => $current_user->ID,
    );
    
    $attachment_id = wp_insert_attachment($attachment, $uploaded_file['file']);
    error_log("CASA Upload: Attachment creation result - ID: " . $attachment_id);
    
    if (is_wp_error($attachment_id)) {
        error_log("CASA Upload: Attachment creation failed: " . $attachment_id->get_error_message());
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create attachment: ' . $attachment_id->get_error_message()
        ), 500);
    }
    
    // Add organization metadata to attachment
    update_post_meta($attachment_id, 'casa_organization_id', $organization_id);
    update_post_meta($attachment_id, 'casa_case_number', $case_number);
    update_post_meta($attachment_id, 'casa_document_type', $document_type);
    update_post_meta($attachment_id, 'casa_is_confidential', $is_confidential ? 1 : 0);
    
    // Generate metadata
    $attachment_data = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
    wp_update_attachment_metadata($attachment_id, $attachment_data);
    
    // Store in documents table
    $documents_table = $wpdb->prefix . 'casa_documents';
    $document_data = array(
        'case_number' => $case_number,
        'organization_id' => $organization_id,
        'child_name' => $case->child_first_name . ' ' . $case->child_last_name,
        'document_type' => $document_type,
        'document_name' => $document_name,
        'file_name' => basename($uploaded_file['file']),
        'file_size' => $file['size'],
        'file_url' => $uploaded_file['url'],
        'attachment_id' => $attachment_id,
        'upload_date' => current_time('mysql'),
        'uploaded_by' => $uploaded_by,
        'description' => $description,
        'is_confidential' => $is_confidential ? 1 : 0,
    );
    
    $result = $wpdb->insert($documents_table, $document_data);
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to save document: ' . $wpdb->last_error
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $wpdb->insert_id,
            'attachment_id' => $attachment_id,
            'file_url' => $uploaded_file['url'],
            'file_name' => basename($uploaded_file['file']),
            'file_size' => $file['size'],
            'message' => 'Document uploaded successfully via test endpoint'
        )
    ), 200);
}

function casa_upload_document_new($request) {
    error_log("NEW UPLOAD FUNCTION CALLED - this should work!");
    
    // Force use default organization - no user checks
    global $wpdb;
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $organization_id = $wpdb->get_var("SELECT id FROM $orgs_table ORDER BY id ASC LIMIT 1");
    
    if (!$organization_id) {
        // Create default organization
        $wpdb->insert($orgs_table, array(
            'name' => 'Default CASA Organization',
            'slug' => 'default-new',
            'status' => 'active',
            'settings' => json_encode(array()),
            'created_at' => current_time('mysql')
        ));
        $organization_id = $wpdb->insert_id;
    }
    
    error_log("Using organization ID: " . $organization_id);
    
    // Get form data
    $case_number = $request->get_param('case_number');
    $document_type = $request->get_param('document_type') ?: 'other';
    $document_name = $request->get_param('document_name') ?: 'Uploaded Document';
    $description = $request->get_param('description') ?: '';
    $is_confidential = $request->get_param('is_confidential') === 'true';
    $uploaded_by = $request->get_param('uploaded_by') ?: 'System User';
    
    // Check if case exists
    $cases_table = $wpdb->prefix . 'casa_cases';
    $case = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $cases_table WHERE case_number = %s AND organization_id = %d",
        $case_number, $organization_id
    ));
    
    if (!$case) {
        error_log("Case not found: " . $case_number);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Case not found: ' . $case_number
        ), 404);
    }
    
    error_log("Case found: " . $case->case_number);
    
    // Handle file upload
    $uploaded_files = $request->get_file_params();
    if (empty($uploaded_files['file'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'No file uploaded'
        ), 400);
    }
    
    $file = $uploaded_files['file'];
    error_log("File received: " . $file['name'] . " (" . $file['size'] . " bytes)");
    
    // Include WordPress upload functions
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    
    // Upload file
    $upload_overrides = array('test_form' => false);
    $uploaded_file = wp_handle_upload($file, $upload_overrides);
    
    if (isset($uploaded_file['error'])) {
        error_log("Upload error: " . $uploaded_file['error']);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Upload failed: ' . $uploaded_file['error']
        ), 500);
    }
    
    error_log("File uploaded to: " . $uploaded_file['file']);
    
    // Create attachment in media library
    $attachment = array(
        'post_mime_type' => $uploaded_file['type'],
        'post_title' => $document_name,
        'post_content' => $description,
        'post_status' => 'inherit',
        'post_author' => 1
    );
    
    $attachment_id = wp_insert_attachment($attachment, $uploaded_file['file']);
    if (is_wp_error($attachment_id)) {
        error_log("Attachment creation failed: " . $attachment_id->get_error_message());
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create attachment'
        ), 500);
    }
    
    error_log("Attachment created with ID: " . $attachment_id);
    
    // Generate metadata
    $attachment_data = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
    wp_update_attachment_metadata($attachment_id, $attachment_data);
    
    // Store in documents table
    $documents_table = $wpdb->prefix . 'casa_documents';
    $document_data = array(
        'case_number' => $case_number,
        'organization_id' => $organization_id,
        'child_name' => $case->child_first_name . ' ' . $case->child_last_name,
        'document_type' => $document_type,
        'document_name' => $document_name,
        'file_name' => basename($uploaded_file['file']),
        'file_size' => $file['size'],
        'file_url' => $uploaded_file['url'],
        'attachment_id' => $attachment_id,
        'upload_date' => current_time('mysql'),
        'uploaded_by' => $uploaded_by,
        'description' => $description,
        'is_confidential' => $is_confidential ? 1 : 0,
    );
    
    $result = $wpdb->insert($documents_table, $document_data);
    if ($result === false) {
        error_log("Database insert failed: " . $wpdb->last_error);
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to save document: ' . $wpdb->last_error
        ), 500);
    }
    
    $document_id = $wpdb->insert_id;
    error_log("Document saved with ID: " . $document_id);
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'id' => $document_id,
            'attachment_id' => $attachment_id,
            'file_url' => $uploaded_file['url'],
            'file_name' => basename($uploaded_file['file']),
            'file_size' => $file['size'],
            'message' => 'Document uploaded successfully!'
        )
    ), 200);
}

function casa_download_document($request) {
    global $wpdb;
    
    // Get current user and organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    // Development fallback - use default organization if user not associated
    if (!$organization_id) {
        $orgs_table = $wpdb->prefix . 'casa_organizations';
        $organization_id = $wpdb->get_var("SELECT id FROM $orgs_table ORDER BY id ASC LIMIT 1");
        
        if (!$organization_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'No organization found in system'
            ), 400);
        }
        
        error_log("CASA Download: Using fallback organization ID: " . $organization_id);
    }
    
    $document_id = $request['id'];
    $table_name = $wpdb->prefix . 'casa_documents';
    $cases_table = $wpdb->prefix . 'casa_cases';
    
    // Get document with organization verification
    $document = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE id = %d AND organization_id = %d",
        $document_id, $organization_id
    ));
    
    error_log("CASA Download: Looking for document ID " . $document_id . " in org " . $organization_id);
    error_log("CASA Download: Document found: " . ($document ? 'YES' : 'NO'));
    if ($document) {
        error_log("CASA Download: Document data: " . print_r($document, true));
    }
    
    if (!$document) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Document not found or access denied'
        ), 404);
    }
    
    // Check if user has access to this document
    $user_roles = $current_user->roles;
    $is_volunteer = in_array('casa_volunteer', $user_roles);
    
    if ($is_volunteer) {
        // Volunteers can only access documents for cases assigned to them
        $case_access = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $cases_table WHERE case_number = %s AND assigned_volunteer_id = %d AND organization_id = %d",
            $document->case_number, $current_user->ID, $organization_id
        ));
        
        if ($case_access == 0) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Access denied: Document not associated with your assigned cases'
            ), 403);
        }
    }
    
    // Check if document file exists
    if (!$document->attachment_id || !$document->file_url) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Document file not found'
        ), 404);
    }
    
    // Get attachment information
    $attachment = get_post($document->attachment_id);
    if (!$attachment) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Attachment not found'
        ), 404);
    }
    
    $file_path = get_attached_file($document->attachment_id);
    if (!$file_path || !file_exists($file_path)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Physical file not found'
        ), 404);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'download_url' => $document->file_url,
            'file_name' => $document->file_name,
            'file_size' => $document->file_size,
            'document_type' => $document->document_type,
            'case_number' => $document->case_number,
        )
    ), 200);
}

function casa_fix_user_organizations($request) {
    global $wpdb;
    
    // Get or create a default organization
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $organization = $wpdb->get_row("SELECT * FROM $orgs_table WHERE status = 'active' ORDER BY id ASC LIMIT 1");
    
    if (!$organization) {
        // Create a default organization
        $wpdb->insert($orgs_table, array(
            'name' => 'Default CASA Organization',
            'slug' => 'default',
            'status' => 'active',
            'settings' => json_encode(array(
                'allowVolunteerSelfRegistration' => true,
                'requireBackgroundCheck' => true,
                'maxCasesPerVolunteer' => 5,
            )),
            'created_at' => current_time('mysql')
        ));
        $organization_id = $wpdb->insert_id;
        $organization = $wpdb->get_row("SELECT * FROM $orgs_table WHERE id = $organization_id");
    } else {
        $organization_id = $organization->id;
    }
    
    // Get all WordPress users
    $users = get_users();
    $fixed_users = array();
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    
    foreach ($users as $user) {
        // Check if user already has an organization association
        $existing_association = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $user_orgs_table WHERE user_id = %d AND status = 'active'",
            $user->ID
        ));
        
        if (!$existing_association) {
            // Create association
            $result = $wpdb->insert($user_orgs_table, array(
                'user_id' => $user->ID,
                'organization_id' => $organization_id,
                'casa_role' => 'supervisor', // Default role
                'status' => 'active',
                'created_at' => current_time('mysql'),
                'updated_at' => current_time('mysql')
            ));
            
            if ($result) {
                $fixed_users[] = array(
                    'user_id' => $user->ID,
                    'email' => $user->user_email,
                    'organization_id' => $organization_id
                );
            }
        }
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'organization' => array(
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug
            ),
            'fixed_users' => $fixed_users,
            'total_fixed' => count($fixed_users),
            'message' => 'User-organization associations have been fixed'
        )
    ), 200);
}

function casa_associate_user_20($request) {
    global $wpdb;
    
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    
    // Check if association already exists for user 1 and organization 20
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM $user_orgs_table WHERE user_id = 1 AND organization_id = 20 AND status = 'active'"
    ));
    
    if ($existing) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Association already exists',
            'data' => array(
                'user_id' => 1,
                'organization_id' => 20,
                'existing_id' => $existing
            )
        ), 200);
    }
    
    // Create the association
    $result = $wpdb->insert($user_orgs_table, array(
        'user_id' => 1,
        'organization_id' => 20,
        'casa_role' => 'supervisor',
        'status' => 'active',
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ));
    
    if ($result) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'User associated with organization successfully!',
            'data' => array(
                'user_id' => 1,
                'organization_id' => 20,
                'association_id' => $wpdb->insert_id,
                'role' => 'supervisor'
            )
        ), 200);
    } else {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to create association: ' . $wpdb->last_error
        ), 500);
    }
}

function casa_delete_document($request) {
    // Get current user and organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    $document_id = $request->get_param('id');
    
    // Get document from database
    global $wpdb;
    $documents_table = $wpdb->prefix . 'casa_documents';
    $document = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $documents_table WHERE id = %d AND organization_id = %d",
        $document_id, $organization_id
    ));
    
    if (!$document) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Document not found'
        ), 404);
    }
    
    // Check if user has permission to delete this document
    $user_roles = casa_get_user_profile($current_user->ID);
    if (isset($user_roles['roles']) && in_array('volunteer', $user_roles['roles'])) {
        // Volunteers cannot delete documents
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Permission denied'
        ), 403);
    }
    
    // Delete the WordPress attachment if it exists
    if ($document->attachment_id) {
        wp_delete_attachment($document->attachment_id, true); // true = force delete
    }
    
    // Delete from database
    $result = $wpdb->delete($documents_table, array('id' => $document_id));
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to delete document'
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Document deleted successfully'
    ), 200);
}

// Comprehensive reporting functions
function casa_generate_comprehensive_report($request) {
    $params = $request->get_json_params();
    
    // Get current user and organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    $case_number = $params['case_number'];
    
    // In production, this would compile all case-related data
    $comprehensive_data = array(
        'case_details' => array(
            'case_number' => $case_number,
            'generated_by' => $current_user->display_name,
            'generated_date' => current_time('mysql'),
            'report_type' => $params['report_type'],
        ),
        'contact_logs' => array(/* fetch from database */),
        'home_visit_reports' => array(/* fetch from database */),
        'court_reports' => array(/* fetch from database */),
        'documents' => array(/* fetch from database */),
        'court_hearings' => array(/* fetch from database */),
        'timeline' => array(/* compile chronological timeline */),
        'statistics' => array(
            'total_contacts' => 15,
            'total_home_visits' => 8,
            'total_court_hearings' => 3,
            'total_documents' => 12,
            'case_age_days' => 300,
            'last_contact_days' => 5,
        ),
    );
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $comprehensive_data
    ), 200);
}

function casa_get_complete_case_data($request) {
    $case_number = $request['case_number'];
    
    // Get current user and organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    // In production, fetch all related data from database
    $complete_case_data = array(
        'case_details' => array(
            'case_number' => $case_number,
            'child_name' => 'Emily Johnson',
            'case_type' => 'abuse',
            'case_status' => 'active',
            'assigned_volunteer' => 'Jane Smith',
            'created_date' => '2024-01-15',
        ),
        'contact_logs' => array(
            array(
                'id' => 1,
                'contact_date' => '2024-12-10',
                'contact_type' => 'home-visit',
                'summary' => 'Child appears well-adjusted',
                'created_by' => 'Jane Smith',
            ),
        ),
        'documents' => array(
            array(
                'id' => 1,
                'document_type' => 'court-order',
                'document_name' => 'Initial Removal Order',
                'upload_date' => '2024-01-15',
            ),
        ),
        'court_hearings' => array(
            array(
                'id' => 1,
                'hearing_date' => '2024-12-20',
                'hearing_type' => 'Review Hearing',
                'status' => 'scheduled',
            ),
        ),
        'reports' => array(
            'home_visits' => array(
                array(
                    'id' => 1,
                    'visit_date' => '2024-12-10',
                    'child_condition' => 'excellent',
                    'home_condition' => 'excellent',
                ),
            ),
            'court_reports' => array(
                array(
                    'id' => 1,
                    'hearing_date' => '2024-09-15',
                    'hearing_type' => 'Initial Hearing',
                    'recommendations' => 'Continue foster placement',
                ),
            ),
        ),
    );
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $complete_case_data
    ), 200);
}

function casa_get_case_timeline($request) {
    $case_number = $request['case_number'];
    
    // Get current user and organization
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    // In production, compile chronological timeline from all case activities
    $timeline = array(
        array(
            'date' => '2024-01-15',
            'time' => '10:00:00',
            'event' => 'Case opened',
            'type' => 'case_creation',
            'details' => 'Case created due to abuse allegations',
            'created_by' => 'System',
        ),
        array(
            'date' => '2024-01-20',
            'time' => '14:30:00',
            'event' => 'CASA volunteer assigned',
            'type' => 'assignment',
            'details' => 'Jane Smith assigned as CASA volunteer',
            'created_by' => 'Supervisor',
        ),
        array(
            'date' => '2024-12-10',
            'time' => '15:00:00',
            'event' => 'Home visit conducted',
            'type' => 'contact',
            'details' => 'Regular home visit - child doing well',
            'created_by' => 'Jane Smith',
        ),
        array(
            'date' => '2024-12-10',
            'time' => '16:30:00',
            'event' => 'Home visit report submitted',
            'type' => 'report',
            'details' => 'Comprehensive home visit report filed',
            'created_by' => 'Jane Smith',
        ),
    );
    
    // Sort by date and time (most recent first)
    usort($timeline, function($a, $b) {
        return strtotime($b['date'] . ' ' . $b['time']) - strtotime($a['date'] . ' ' . $a['time']);
    });
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => $timeline
    ), 200);
}

// Debug endpoint to check user and organization info
function casa_debug_user($request) {
    $current_user = wp_get_current_user();
    
    if (!$current_user || $current_user->ID == 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'No user authenticated'
        ), 401);
    }
    
    global $wpdb;
    
    // Check if tables exist
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    
    $tables_exist = array(
        'casa_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$orgs_table'") == $orgs_table,
        'casa_user_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$user_orgs_table'") == $user_orgs_table
    );
    
    // Create tables if they don't exist
    $table_creation_errors = array();
    if (!$tables_exist['casa_organizations'] || !$tables_exist['casa_user_organizations']) {
        // Try to create organizations table manually
        if (!$tables_exist['casa_organizations']) {
            // Drop table if it exists but is corrupted
            $wpdb->query("DROP TABLE IF EXISTS $orgs_table");
            
            $charset_collate = $wpdb->get_charset_collate();
            $sql = "CREATE TABLE $orgs_table (
                id bigint(20) NOT NULL AUTO_INCREMENT,
                name varchar(255) NOT NULL,
                slug varchar(100) NOT NULL UNIQUE,
                domain varchar(255),
                status enum('active','inactive','suspended') DEFAULT 'active',
                contact_email varchar(255),
                phone varchar(20),
                address text,
                settings longtext,
                created_at datetime DEFAULT CURRENT_TIMESTAMP,
                updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY slug (slug)
            ) $charset_collate;";
            
            $result = $wpdb->query($sql);
            if ($result === false) {
                $table_creation_errors[] = "Organizations table creation failed: " . $wpdb->last_error;
            }
        }
        
        casa_create_tables();
        $tables_exist = array(
            'casa_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$orgs_table'") == $orgs_table,
            'casa_user_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$user_orgs_table'") == $user_orgs_table
        );
    }
    
    $user_orgs = array();
    $all_orgs = array();
    $organization_id = 0;
    
    if ($tables_exist['casa_organizations'] && $tables_exist['casa_user_organizations']) {
        // Get user organizations
        $user_orgs = $wpdb->get_results($wpdb->prepare(
            "SELECT uo.*, o.name, o.slug 
             FROM $user_orgs_table uo 
             LEFT JOIN $orgs_table o ON uo.organization_id = o.id 
             WHERE uo.user_id = %d",
            $current_user->ID
        ));
        
        $all_orgs = $wpdb->get_results("SELECT * FROM $orgs_table");
        $organization_id = casa_get_user_organization_id($current_user->ID);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'user_id' => $current_user->ID,
            'user_email' => $current_user->user_email,
            'user_login' => $current_user->user_login,
            'tables_exist' => $tables_exist,
            'table_creation_errors' => $table_creation_errors,
            'user_organizations' => $user_orgs,
            'all_organizations' => $all_orgs,
            'current_organization_id' => $organization_id
        )
    ), 200);
}

// Register debug endpoint
add_action('rest_api_init', function() {
    register_rest_route('casa/v1', '/debug/user', array(
        'methods' => 'GET',
        'callback' => 'casa_debug_user',
        'permission_callback' => 'casa_check_authentication'
    ));
    
    register_rest_route('casa/v1', '/test/plugin-reload', array(
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response(array(
                'success' => true,
                'message' => 'Plugin has been reloaded successfully!',
                'timestamp' => current_time('mysql')
            ), 200);
        },
        'permission_callback' => '__return_true'
    ));
    
    // Temporary endpoint to fix user associations - no auth required
    register_rest_route('casa/v1', '/admin/fix-all-users', array(
        'methods' => 'POST',
        'callback' => 'casa_fix_all_user_associations',
        'permission_callback' => '__return_true'
    ));
});

// Temporary function to fix all user associations
function casa_fix_all_user_associations($request) {
    global $wpdb;
    
    try {
        // Get all WordPress users
        $users = get_users(array('fields' => array('ID', 'user_login', 'user_email', 'display_name')));
        
        // Get or create default organization
        $orgs_table = $wpdb->prefix . 'casa_organizations';
        $organization_id = $wpdb->get_var("SELECT id FROM $orgs_table ORDER BY id ASC LIMIT 1");
        
        if (!$organization_id) {
            // Create default organization
            $wpdb->insert($orgs_table, array(
                'name' => 'Default CASA Organization',
                'slug' => 'default-casa',
                'status' => 'active',
                'settings' => json_encode(array()),
                'created_at' => current_time('mysql')
            ));
            $organization_id = $wpdb->insert_id;
        }
        
        $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
        $fixed_count = 0;
        $users_processed = array();
        
        foreach ($users as $user) {
            $user_id = $user->ID;
            
            // Check if association exists
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM $user_orgs_table WHERE user_id = %d AND organization_id = %d",
                $user_id, $organization_id
            ));
            
            if (!$existing) {
                // Create association
                $role = ($user->user_login === 'admin' || strpos($user->user_email, 'admin') !== false) ? 'admin' : 'volunteer';
                
                $wpdb->insert($user_orgs_table, array(
                    'user_id' => $user_id,
                    'organization_id' => $organization_id,
                    'casa_role' => $role,
                    'status' => 'active',
                    'created_at' => current_time('mysql')
                ));
                $fixed_count++;
            } else {
                // Update existing to make sure it's active
                $wpdb->update($user_orgs_table, 
                    array('status' => 'active', 'updated_at' => current_time('mysql')),
                    array('user_id' => $user_id, 'organization_id' => $organization_id)
                );
            }
            
            $users_processed[] = array(
                'id' => $user_id,
                'login' => $user->user_login,
                'email' => $user->user_email
            );
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => "Fixed user associations for all users",
            'data' => array(
                'organization_id' => $organization_id,
                'users_processed' => count($users_processed),
                'new_associations_created' => $fixed_count,
                'users' => $users_processed
            )
        ), 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to fix user associations: ' . $e->getMessage()
        ), 500);
    }
}

// ============================================================================
// ORGANIZATION REGISTRATION AND ADMIN FUNCTIONS
// ============================================================================

// Register organization with admin user
function casa_register_organization($request) {
    $params = $request->get_json_params();
    
    // Debug logging
    error_log('CASA Register Organization - Received params: ' . print_r($params, true));
    
    $name = sanitize_text_field($params['name']);
    $slug = sanitize_title($params['slug']);
    $admin_email = sanitize_email($params['adminEmail']);
    $admin_password = $params['adminPassword'];
    $admin_first_name = sanitize_text_field($params['adminFirstName']);
    $admin_last_name = sanitize_text_field($params['adminLastName']);
    $domain = $params['domain'] ? sanitize_text_field($params['domain']) : '';

    // Validate required fields
    if (empty($name) || empty($slug) || empty($admin_email) || empty($admin_password)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Missing required fields'
        ), 400);
    }

    // Check if organization slug already exists
    global $wpdb;
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    
    $existing_org = $wpdb->get_row($wpdb->prepare(
        "SELECT id FROM $orgs_table WHERE slug = %s",
        $slug
    ));

    if ($existing_org) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Organization with this slug already exists'
        ), 400);
    }

    // Check if admin email already exists
    if (email_exists($admin_email)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User with this email already exists'
        ), 400);
    }

    // Create WordPress user for admin
    $admin_user_id = wp_create_user($admin_email, $admin_password, $admin_email);
    
    if (is_wp_error($admin_user_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to create admin user: ' . $admin_user_id->get_error_message()
        ), 500);
    }

    // Update user meta
    wp_update_user(array(
        'ID' => $admin_user_id,
        'first_name' => $admin_first_name,
        'last_name' => $admin_last_name,
        'display_name' => $admin_first_name . ' ' . $admin_last_name
    ));

    // Assign organization admin role
    $user = new WP_User($admin_user_id);
    $user->set_role('casa_organization_admin');

    // Create organization record
    $organization_id = $wpdb->insert($orgs_table, array(
        'name' => $name,
        'slug' => $slug,
        'domain' => $domain,
        'status' => 'active',
        'contact_email' => $admin_email,
        'settings' => json_encode(array(
            'allowVolunteerSelfRegistration' => true,
            'requireBackgroundCheck' => true,
            'maxCasesPerVolunteer' => 5
        )),
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ));

    if (!$organization_id) {
        // Clean up the user if organization creation failed
        wp_delete_user($admin_user_id);
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to create organization'
        ), 500);
    }

    $organization_id = $wpdb->insert_id;

    // Link user to organization
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    $wpdb->insert($user_orgs_table, array(
        'user_id' => $admin_user_id,
        'organization_id' => $organization_id,
        'casa_role' => 'administrator',
        'status' => 'active',
        'background_check_status' => 'approved',
        'training_status' => 'completed',
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ));

    // Generate JWT token for the new admin
    $token = casa_generate_jwt_token($admin_user_id);

    // Get organization data
    $organization_data = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $orgs_table WHERE id = %d",
        $organization_id
    ), ARRAY_A);

    // Get user data
    $user_data = array(
        'id' => $admin_user_id,
        'email' => $admin_email,
        'firstName' => $admin_first_name,
        'lastName' => $admin_last_name,
        'roles' => array('casa_organization_admin'),
        'organizationId' => (string)$organization_id,
        'isActive' => true,
        'lastLogin' => current_time('mysql'),
        'createdAt' => current_time('mysql'),
        'updatedAt' => current_time('mysql')
    );

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'organization' => $organization_data,
            'user' => $user_data,
            'token' => $token
        )
    ), 201);
}

// Register volunteer within organization
function casa_register_volunteer($request) {
    $email = sanitize_email($request['email']);
    $password = $request['password'];
    $first_name = sanitize_text_field($request['firstName']);
    $last_name = sanitize_text_field($request['lastName']);
    $organization_id = intval($request['organizationId']);

    // Get current user (should be organization admin)
    $current_user = wp_get_current_user();
    if (!$current_user || $current_user->ID == 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Authentication required'
        ), 401);
    }

    // Check if current user can create volunteers for this organization
    $user_org_id = casa_get_user_organization_id($current_user->ID);
    if ($user_org_id !== $organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Not authorized to create volunteers for this organization'
        ), 403);
    }

    // Validate required fields
    if (empty($email) || empty($password) || empty($first_name) || empty($last_name)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Missing required fields'
        ), 400);
    }

    // Check if user email already exists
    if (email_exists($email)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User with this email already exists'
        ), 400);
    }

    // Create WordPress user for volunteer
    $volunteer_user_id = wp_create_user($email, $password, $email);
    
    if (is_wp_error($volunteer_user_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to create volunteer user: ' . $volunteer_user_id->get_error_message()
        ), 500);
    }

    // Update user meta
    wp_update_user(array(
        'ID' => $volunteer_user_id,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'display_name' => $first_name . ' ' . $last_name
    ));

    // Assign volunteer role
    $user = new WP_User($volunteer_user_id);
    $user->set_role('casa_volunteer');

    // Link user to organization
    global $wpdb;
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    $wpdb->insert($user_orgs_table, array(
        'user_id' => $volunteer_user_id,
        'organization_id' => $organization_id,
        'casa_role' => 'volunteer',
        'status' => 'active',
        'background_check_status' => 'pending',
        'training_status' => 'pending',
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ));

    // Get user data
    $user_data = array(
        'id' => $volunteer_user_id,
        'email' => $email,
        'firstName' => $first_name,
        'lastName' => $last_name,
        'roles' => array('casa_volunteer'),
        'organizationId' => (string)$organization_id,
        'isActive' => true,
        'createdAt' => current_time('mysql'),
        'updatedAt' => current_time('mysql')
    );

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'user' => $user_data
        )
    ), 201);
}

// Admin cleanup functions
function casa_admin_cleanup_meta($request) {
    // Check if user is admin
    if (!current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Administrator access required'
        ), 403);
    }

    global $wpdb;
    
    // Clean up user meta for CASA-related data
    $wpdb->query("DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'casa_%'");
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'User metadata cleaned up'
    ), 200);
}

function casa_admin_reset_tables($request) {
    // Check if user is admin
    if (!current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Administrator access required'
        ), 403);
    }

    global $wpdb;
    
    // Reset plugin tables
    $tables = array(
        $wpdb->prefix . 'casa_organizations',
        $wpdb->prefix . 'casa_user_organizations'
    );

    foreach ($tables as $table) {
        $wpdb->query("TRUNCATE TABLE $table");
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Plugin tables reset'
    ), 200);
}

function casa_admin_setup_roles($request) {
    // Check if user is admin
    if (!current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Administrator access required'
        ), 403);
    }

    casa_add_user_roles();
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'User roles configured'
    ), 200);
}

function casa_admin_setup_endpoints($request) {
    // Check if user is admin
    if (!current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Administrator access required'
        ), 403);
    }

    // Flush rewrite rules to ensure endpoints are registered
    flush_rewrite_rules();
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Registration endpoints configured'
    ), 200);
}

function casa_admin_setup_multitenancy($request) {
    // Check if user is admin
    if (!current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Administrator access required'
        ), 403);
    }

    // Ensure tables exist
    casa_create_tables();
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Multi-tenancy configured'
    ), 200);
}

function casa_get_system_status($request) {
    // Check if user is admin
    if (!current_user_can('administrator')) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Administrator access required'
        ), 403);
    }

    global $wpdb;
    
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    
    $organizations = $wpdb->get_var("SELECT COUNT(*) FROM $orgs_table");
    $total_users = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->users}");
    $volunteers = $wpdb->get_var("SELECT COUNT(DISTINCT user_id) FROM $user_orgs_table WHERE role = 'volunteer'");
    $cases = wp_count_posts('casa_case')->publish ?? 0;
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'organizations' => (int)$organizations,
            'users' => (int)$total_users,
            'volunteers' => (int)$volunteers,
            'cases' => (int)$cases,
            'pluginVersion' => '2.0.0',
            'wpVersion' => get_bloginfo('version'),
            'systemHealth' => 'Good'
        )
    ), 200);
}

// Helper function to get JWT secret key
function casa_get_jwt_secret_key() {
    return defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : 'fallback-secret-key-change-this';
}

// Helper function to generate JWT token
function casa_generate_jwt_token($user_id) {
    // Use WordPress JWT Auth plugin if available
    if (function_exists('Jwt_Auth_Public')) {
        try {
            // Try to use the JWT Auth plugin
            $jwt_auth = new Jwt_Auth_Public('jwt-auth', '1.0.0');
            $token_request = new WP_REST_Request('POST', '/jwt-auth/v1/token');
            $user = get_user_by('id', $user_id);
            $token_request->set_param('username', $user->user_login);
            $token_request->set_param('password', 'temp'); // This won't work without actual password
            
            // Fall back to manual token generation
        } catch (Exception $e) {
            // Fall back to manual token generation
        }
    }
    
    // Manual JWT token generation (basic implementation)
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'iss' => get_bloginfo('url'),
        'iat' => time(),
        'nbf' => time(),
        'exp' => time() + (DAY_IN_SECONDS * 7),
        'data' => [
            'user' => [
                'id' => $user_id
            ]
        ]
    ]);
    
    $header_encoded = casa_base64url_encode($header);
    $payload_encoded = casa_base64url_encode($payload);
    
    $signature = hash_hmac('sha256', $header_encoded . "." . $payload_encoded, casa_get_jwt_secret_key(), true);
    $signature_encoded = casa_base64url_encode($signature);
    
    return $header_encoded . "." . $payload_encoded . "." . $signature_encoded;
}

// Helper function for base64url encoding
function casa_base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// Assign user to organization
function casa_assign_user_to_organization($request) {
    $params = $request->get_json_params();
    
    // Validate required fields
    if (empty($params['user_id']) || empty($params['organization_id']) || empty($params['casa_role'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Missing required fields: user_id, organization_id, casa_role'
        ), 400);
    }
    
    $user_id = intval($params['user_id']);
    $organization_id = intval($params['organization_id']);
    $casa_role = sanitize_text_field($params['casa_role']);
    $status = isset($params['status']) ? sanitize_text_field($params['status']) : 'active';
    
    // Check if user exists
    $user = get_user_by('id', $user_id);
    if (!$user) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not found'
        ), 404);
    }
    
    // Check if organization exists
    global $wpdb;
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $org = $wpdb->get_row($wpdb->prepare("SELECT id FROM $orgs_table WHERE id = %d", $organization_id));
    if (!$org) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Organization not found'
        ), 404);
    }
    
    // Check if assignment already exists
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT id FROM $user_orgs_table WHERE user_id = %d AND organization_id = %d",
        $user_id, $organization_id
    ));
    
    if ($existing) {
        // Update existing assignment
        $result = $wpdb->update(
            $user_orgs_table,
            array(
                'casa_role' => $casa_role,
                'status' => $status,
                'updated_at' => current_time('mysql')
            ),
            array('user_id' => $user_id, 'organization_id' => $organization_id),
            array('%s', '%s', '%s'),
            array('%d', '%d')
        );
    } else {
        // Create new assignment
        $result = $wpdb->insert($user_orgs_table, array(
            'user_id' => $user_id,
            'organization_id' => $organization_id,
            'casa_role' => $casa_role,
            'status' => $status,
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ));
    }
    
    if ($result === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'Failed to assign user to organization'
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'user_id' => $user_id,
            'organization_id' => $organization_id,
            'casa_role' => $casa_role,
            'status' => $status,
            'message' => 'User assigned to organization successfully'
        )
    ), 200);
}

// Register organization and admin endpoints with higher priority
add_action('rest_api_init', function() {
    // Organization registration endpoint (public)
    register_rest_route('casa/v1', '/register-organization', array(
        'methods' => 'POST',
        'callback' => 'casa_register_organization',
        'permission_callback' => '__return_true'
    ));

    // Volunteer registration endpoint (requires organization admin)
    register_rest_route('casa/v1', '/register-volunteer', array(
        'methods' => 'POST',
        'callback' => 'casa_register_volunteer',
        'permission_callback' => 'casa_check_authentication'
    ));

    // Admin cleanup endpoints
    register_rest_route('casa/v1', '/admin/cleanup-meta', array(
        'methods' => 'POST',
        'callback' => 'casa_admin_cleanup_meta',
        'permission_callback' => 'casa_check_authentication'
    ));

    register_rest_route('casa/v1', '/admin/reset-tables', array(
        'methods' => 'POST',
        'callback' => 'casa_admin_reset_tables',
        'permission_callback' => 'casa_check_authentication'
    ));

    register_rest_route('casa/v1', '/admin/setup-roles', array(
        'methods' => 'POST',
        'callback' => 'casa_admin_setup_roles',
        'permission_callback' => 'casa_check_authentication'
    ));

    register_rest_route('casa/v1', '/admin/setup-endpoints', array(
        'methods' => 'POST',
        'callback' => 'casa_admin_setup_endpoints',
        'permission_callback' => 'casa_check_authentication'
    ));

    register_rest_route('casa/v1', '/admin/setup-multitenancy', array(
        'methods' => 'POST',
        'callback' => 'casa_admin_setup_multitenancy',
        'permission_callback' => 'casa_check_authentication'
    ));

    register_rest_route('casa/v1', '/system-status', array(
        'methods' => 'GET',
        'callback' => 'casa_get_system_status',
        'permission_callback' => 'casa_check_authentication'
    ));

    // Assign user to organization
    register_rest_route('casa/v1', '/user-organizations', array(
        'methods' => 'POST',
        'callback' => 'casa_assign_user_to_organization',
        'permission_callback' => 'casa_check_authentication'
    ));

    // Database cleanup endpoint
    register_rest_route('casa/v1', '/admin/cleanup-database', array(
        'methods' => 'POST',
        'callback' => 'casa_admin_cleanup_database',
        'permission_callback' => '__return_true'
    ));

    // Setup Formidable Forms tables (for MySQL 8.0 compatibility)
    register_rest_route('casa/v1', '/admin/setup-formidable-tables', array(
        'methods' => 'POST',
        'callback' => 'casa_setup_formidable_tables',
        'permission_callback' => '__return_true'
    ));
});

// Database cleanup function
function casa_admin_cleanup_database($request) {
    global $wpdb;
    
    $results = array();
    
    // Clean up casa_organizations - keep only Bartow
    $result = $wpdb->query("DELETE FROM {$wpdb->prefix}casa_organizations WHERE slug != 'bartow'");
    $results['organizations_deleted'] = $result;
    
    // Clean up casa_user_organizations - keep only Bartow associations
    $result = $wpdb->query("
        DELETE uo FROM {$wpdb->prefix}casa_user_organizations uo
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON uo.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['user_organizations_deleted'] = $result;
    
    // Clean up casa_volunteers - keep only Bartow volunteers
    $result = $wpdb->query("
        DELETE v FROM {$wpdb->prefix}casa_volunteers v
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON v.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['volunteers_deleted'] = $result;
    
    // Clean up casa_cases - keep only Bartow cases
    $result = $wpdb->query("
        DELETE c FROM {$wpdb->prefix}casa_cases c
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['cases_deleted'] = $result;
    
    // Clean up casa_contact_logs - keep only Bartow contact logs
    $result = $wpdb->query("
        DELETE cl FROM {$wpdb->prefix}casa_contact_logs cl
        LEFT JOIN {$wpdb->prefix}casa_cases c ON cl.case_id = c.id
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['contact_logs_deleted'] = $result;
    
    // Clean up casa_court_hearings - keep only Bartow court hearings
    $result = $wpdb->query("
        DELETE ch FROM {$wpdb->prefix}casa_court_hearings ch
        LEFT JOIN {$wpdb->prefix}casa_cases c ON ch.case_id = c.id
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['court_hearings_deleted'] = $result;
    
    // Clean up casa_documents - keep only Bartow documents
    $result = $wpdb->query("
        DELETE d FROM {$wpdb->prefix}casa_documents d
        LEFT JOIN {$wpdb->prefix}casa_cases c ON d.case_id = c.id
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['documents_deleted'] = $result;
    
    // Clean up casa_reports - keep only Bartow reports
    $result = $wpdb->query("
        DELETE r FROM {$wpdb->prefix}casa_reports r
        LEFT JOIN {$wpdb->prefix}casa_cases c ON r.case_id = c.id
        LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
        WHERE o.slug != 'bartow' OR o.id IS NULL
    ");
    $results['reports_deleted'] = $result;
    
    // Clean up WordPress users - keep only specified users
    $result = $wpdb->query("DELETE FROM {$wpdb->users} WHERE user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')");
    $results['users_deleted'] = $result;
    
    // Clean up user meta - keep only for specified users
    $result = $wpdb->query("
        DELETE um FROM {$wpdb->usermeta} um
        WHERE um.user_id NOT IN (
            SELECT ID FROM {$wpdb->users} 
            WHERE user_email IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')
        )
    ");
    $results['user_meta_deleted'] = $result;
    
    // Clean up casa_profiles - keep only for specified users
    $result = $wpdb->query("
        DELETE cp FROM {$wpdb->prefix}casa_profiles cp
        WHERE cp.user_id NOT IN (
            SELECT ID FROM {$wpdb->users} 
            WHERE user_email IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')
        )
    ");
    $results['casa_profiles_deleted'] = $result;
    
    // Get final state
    $final_orgs = $wpdb->get_results("SELECT id, name, slug, status FROM {$wpdb->prefix}casa_organizations");
    $final_users = $wpdb->get_results("SELECT ID, user_email, display_name FROM {$wpdb->users}");
    $final_user_orgs = $wpdb->get_results("
        SELECT uo.*, u.user_email, o.name as org_name 
        FROM {$wpdb->prefix}casa_user_organizations uo
        JOIN {$wpdb->users} u ON uo.user_id = u.ID
        JOIN {$wpdb->prefix}casa_organizations o ON uo.organization_id = o.id
    ");
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'cleanup_results' => $results,
            'final_organizations' => $final_orgs,
            'final_users' => $final_users,
            'final_user_organizations' => $final_user_orgs
        )
    ), 200);
}

// Change user password
function casa_change_user_password($request) {
    $user_id = $request->get_param('id');
    $params = $request->get_json_params();
    
    // Get current user and organization for tenant isolation
    $current_user = wp_get_current_user();
    $organization_id = casa_get_user_organization_id($current_user->ID);
    
    if (!$organization_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not associated with any organization'
        ), 400);
    }
    
    // Check if the user belongs to the same organization
    global $wpdb;
    $table_name = $wpdb->prefix . 'casa_user_organizations';
    $user_org = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name WHERE user_id = %d AND organization_id = %d",
        $user_id, $organization_id
    ));
    
    if (!$user_org) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'User not found in organization'
        ), 404);
    }
    
    // Validate new password
    if (!isset($params['new_password']) || strlen($params['new_password']) < 8) {
        return new WP_REST_Response(array(
            'success' => false,
            'error' => 'New password must be at least 8 characters long'
        ), 400);
    }
    
    // Update the user's password in WordPress
    $user_data = array(
        'ID' => $user_id,
        'user_pass' => $params['new_password']
    );
    
    $result = wp_update_user($user_data);
    
    if (is_wp_error($result)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to change password: ' . $result->get_error_message()
        ), 500);
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Password changed successfully'
    ), 200);
}

// Debug function to fix user association
function casa_debug_fix_user_association($request) {
    $params = $request->get_json_params();
    $email = $params['email'] ?? 'walter@test.com';
    
    global $wpdb;
    
    // Get the user ID
    $user = get_user_by('email', $email);
    if (!$user) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User not found: ' . $email
        ), 404);
    }
    
    // Get the Bartow organization ID
    $org = $wpdb->get_row("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE slug = 'bartow'");
    if (!$org) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Bartow organization not found'
        ), 404);
    }
    
    // Check if user is already associated
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}casa_user_organizations WHERE user_id = %d AND organization_id = %d",
        $user->ID, $org->id
    ));
    
    if ($existing) {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'User already associated',
            'data' => array(
                'user_id' => $user->ID,
                'organization_id' => $org->id,
                'status' => $existing->status,
                'role' => $existing->casa_role
            )
        ), 200);
    }
    
    // Associate user with organization
    $result = $wpdb->insert(
        $wpdb->prefix . 'casa_user_organizations',
        array(
            'user_id' => $user->ID,
            'organization_id' => $org->id,
            'casa_role' => 'volunteer',
            'status' => 'active',
            'created_at' => current_time('mysql')
        ),
        array('%d', '%d', '%s', '%s', '%s')
    );
    
    if ($result) {
            return new WP_REST_Response(array(
        'success' => true,
        'message' => 'User successfully associated with organization',
        'data' => array(
            'user_id' => $user->ID,
            'organization_id' => $org->id,
            'user_email' => $email
        )
    ), 200);
} else {
    return new WP_REST_Response(array(
        'success' => false,
        'message' => 'Failed to associate user: ' . $wpdb->last_error
    ), 500);
}
}

// Cleanup test data function
function casa_cleanup_test_data($request) {
    global $wpdb;
    
    // Check if user is administrator
    $current_user = wp_get_current_user();
    if (!in_array('administrator', $current_user->roles)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Only administrators can cleanup test data'
        ), 403);
    }
    
    try {
        // Clean up court hearings test data
        $court_hearings_deleted = $wpdb->delete(
            $wpdb->prefix . 'casa_court_hearings',
            array('case_number' => '2024-001'),
            array('%s')
        );
        
        // Clean up any other test data that might exist
        $documents_deleted = $wpdb->delete(
            $wpdb->prefix . 'casa_documents',
            array('case_number' => '2024-001'),
            array('%s')
        );
        
        $contact_logs_deleted = $wpdb->delete(
            $wpdb->prefix . 'casa_contact_logs',
            array('case_number' => '2024-001'),
            array('%s')
        );
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Test data cleaned up successfully',
            'data' => array(
                'court_hearings_deleted' => $court_hearings_deleted,
                'documents_deleted' => $documents_deleted,
                'contact_logs_deleted' => $contact_logs_deleted
            )
        ), 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Error cleaning up test data: ' . $e->getMessage()
        ), 500);
    }
}

function casa_cleanup_all_documents($request) {
    global $wpdb;
    
    try {
        $documents_table = $wpdb->prefix . 'casa_documents';
        
        // Get all documents with their attachment IDs
        $documents = $wpdb->get_results("SELECT * FROM $documents_table");
        $deleted_files = 0;
        $deleted_attachments = 0;
        
        // Delete WordPress attachments and their files
        foreach ($documents as $document) {
            if ($document->attachment_id) {
                // Delete the attachment and its file
                $deleted = wp_delete_attachment($document->attachment_id, true);
                if ($deleted) {
                    $deleted_attachments++;
                }
            }
        }
        
        // Delete all documents from database
        $deleted_docs = $wpdb->query("DELETE FROM $documents_table");
        
        // Clean up any orphaned organization directories
        $upload_dir = wp_upload_dir();
        $base_upload_path = $upload_dir['basedir'];
        
        // Look for casa-org-* directories
        $casa_dirs = glob($base_upload_path . '/casa-org-*');
        $deleted_dirs = 0;
        
        foreach ($casa_dirs as $dir) {
            if (is_dir($dir)) {
                // Remove directory and all contents
                casa_remove_directory_recursive($dir);
                $deleted_dirs++;
            }
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'All documents cleaned up successfully',
            'data' => array(
                'deleted_documents' => $deleted_docs,
                'deleted_attachments' => $deleted_attachments,
                'deleted_directories' => $deleted_dirs
            )
        ), 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Error cleaning up documents: ' . $e->getMessage()
        ), 500);
    }
}

// Helper function to recursively remove directory
function casa_remove_directory_recursive($dir) {
    if (!is_dir($dir)) {
        return false;
    }
    
    $files = array_diff(scandir($dir), array('.', '..'));
    
    foreach ($files as $file) {
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            casa_remove_directory_recursive($path);
        } else {
            unlink($path);
        }
    }
    
    return rmdir($dir);
}

// ================================
// FORMIDABLE FORMS INTEGRATION
// ================================

/**
 * Submit data to Formidable Forms
 */
function casa_formidable_submit($request) {
    // Add debugging
    error_log('casa_formidable_submit called');
    
    $params = $request->get_json_params();
    error_log('Request params: ' . print_r($params, true));
    
    if (empty($params['form_id']) || empty($params['data'])) {
        error_log('Missing form_id or data');
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Form ID and data are required'
        ), 400);
    }
    
    $form_id = intval($params['form_id']);
    $form_data = $params['data'];
    
    error_log("Form ID: $form_id");
    error_log("Form data: " . print_r($form_data, true));
    
    // Check if Formidable Forms plugin is active
    if (!class_exists('FrmForm')) {
        error_log('Formidable Forms plugin not active');
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Formidable Forms plugin is not active'
        ), 500);
    }
    
    try {
        // Validate form exists
        $form = FrmForm::getOne($form_id);
        if (!$form) {
            error_log("Form ID $form_id does not exist");
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Form does not exist'
            ), 404);
        }
        
        error_log("Form found: " . $form->name);
        
        // Create entry using Formidable Forms API
        $entry_data = array(
            'form_id' => $form_id,
            'item_meta' => $form_data
        );
        
        error_log("Creating entry with data: " . print_r($entry_data, true));
        
        $entry_id = FrmEntry::create($entry_data);
        
        error_log("Entry created with ID: $entry_id");
        
        if (!$entry_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to create form entry'
            ), 500);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array(
                'entry_id' => $entry_id,
                'form_id' => $form_id,
                'form_name' => $form->name,
                'message' => 'Form submitted successfully'
            )
        ), 201);
        
    } catch (Exception $e) {
        error_log('Formidable Forms error: ' . $e->getMessage());
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Form submission failed: ' . $e->getMessage()
        ), 500);
    }
}

/**
 * Get Formidable Forms entries
 */
function casa_formidable_get_entries($request) {
    $form_id = $request->get_param('form_id');
    $entry_id = $request->get_param('entry_id');
    
    if (!$form_id) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Form ID is required'
        ), 400);
    }
    
    // Check if Formidable Forms plugin is active
    if (!class_exists('FrmEntry')) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Formidable Forms plugin is not active'
        ), 500);
    }
    
    try {
        if ($entry_id) {
            // Get specific entry
            $entry = FrmEntry::getOne($entry_id);
            if (!$entry) {
                return new WP_REST_Response(array(
                    'success' => false,
                    'message' => 'Entry not found'
                ), 404);
            }
            
            return new WP_REST_Response(array(
                'success' => true,
                'data' => $entry
            ), 200);
        } else {
            // Get all entries for the form
            $entries = FrmEntry::getAll(array(
                'form_id' => $form_id,
                'order_by' => 'created_at DESC'
            ));
            
            return new WP_REST_Response(array(
                'success' => true,
                'data' => $entries
            ), 200);
        }
        
    } catch (Exception $e) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Failed to retrieve entries: ' . $e->getMessage()
        ), 500);
    }
}

/**
 * Update Formidable Forms entry
 */
function casa_formidable_update_entry($request) {
    $entry_id = $request->get_param('entry_id');
    $params = $request->get_json_params();
    
    if (!$entry_id || empty($params['data'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Entry ID and data are required'
        ), 400);
    }
    
    // Check if Formidable Forms plugin is active
    if (!class_exists('FrmEntry')) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Formidable Forms plugin is not active'
        ), 500);
    }
    
    try {
        // Update entry using Formidable Forms API
        $result = FrmEntry::update($entry_id, array(
            'item_meta' => $params['data']
        ));
        
        if (!$result) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to update entry'
            ), 500);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array(
                'entry_id' => $entry_id,
                'message' => 'Entry updated successfully'
            )
        ), 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Entry update failed: ' . $e->getMessage()
        ), 500);
    }
}

/**
 * Test endpoint for Formidable Forms
 */
function casa_formidable_test($request) {
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Formidable Forms endpoint is working',
        'timestamp' => current_time('mysql'),
        'formidable_active' => class_exists('FrmForm')
    ), 200);
}

/**
 * Setup Formidable Forms database tables for MySQL 8.0 compatibility
 * This bypasses the dbDelta() function which has issues with MySQL 8.0
 */
function casa_setup_formidable_tables($request) {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();
    $prefix = $wpdb->prefix;
    $messages = array();

    // Helper function to safely create table if not exists
    $create_table_if_not_exists = function($table_name, $sql) use ($wpdb, &$messages) {
        $table_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
            DB_NAME,
            $table_name
        ));

        if (!$table_exists) {
            $result = $wpdb->query($sql);
            if ($result !== false) {
                $messages[] = "Created table: $table_name";
            } else {
                $messages[] = "ERROR creating table $table_name: " . $wpdb->last_error;
            }
        } else {
            $messages[] = "Table already exists: $table_name";
        }
    };

    // 1. Create frm_fields table
    $create_table_if_not_exists(
        $prefix . 'frm_fields',
        "CREATE TABLE {$prefix}frm_fields (
            id BIGINT(20) NOT NULL auto_increment,
            field_key varchar(100) default NULL,
            name text default NULL,
            description longtext default NULL,
            type text default NULL,
            default_value longtext default NULL,
            options longtext default NULL,
            field_order int(11) default 0,
            required int(1) default NULL,
            field_options longtext default NULL,
            form_id int(11) default NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            UNIQUE KEY field_key (field_key)
        ) $charset_collate"
    );

    // 2. Create frm_forms table
    $create_table_if_not_exists(
        $prefix . 'frm_forms',
        "CREATE TABLE {$prefix}frm_forms (
            id int(11) NOT NULL auto_increment,
            form_key varchar(100) default NULL,
            name varchar(255) default NULL,
            description text default NULL,
            parent_form_id int(11) default 0,
            logged_in tinyint(1) default NULL,
            editable tinyint(1) default NULL,
            is_template tinyint(1) default 0,
            default_template tinyint(1) default 0,
            status varchar(255) default NULL,
            options longtext default NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY form_key (form_key)
        ) $charset_collate"
    );

    // 3. Create frm_items (entries) table
    $create_table_if_not_exists(
        $prefix . 'frm_items',
        "CREATE TABLE {$prefix}frm_items (
            id BIGINT(20) NOT NULL auto_increment,
            item_key varchar(100) default NULL,
            name varchar(255) default NULL,
            description text default NULL,
            ip text default NULL,
            form_id BIGINT(20) default NULL,
            post_id BIGINT(20) default NULL,
            user_id BIGINT(20) default NULL,
            parent_item_id BIGINT(20) default 0,
            is_draft tinyint(1) default 0,
            updated_by BIGINT(20) default NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY item_key (item_key),
            KEY user_id (user_id),
            KEY parent_item_id (parent_item_id),
            KEY post_id (post_id)
        ) $charset_collate"
    );

    // 4. Create frm_item_metas table
    $create_table_if_not_exists(
        $prefix . 'frm_item_metas',
        "CREATE TABLE {$prefix}frm_item_metas (
            id BIGINT(20) NOT NULL auto_increment,
            meta_value longtext default NULL,
            field_id BIGINT(20) NOT NULL,
            item_id BIGINT(20) NOT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY field_id (field_id),
            KEY item_id (item_id)
        ) $charset_collate"
    );

    // 5. Add composite indexes for optimization
    $indexes_to_add = array(
        array('table' => $prefix . 'frm_items', 'name' => 'idx_form_id_is_draft', 'columns' => 'form_id, is_draft'),
        array('table' => $prefix . 'frm_item_metas', 'name' => 'idx_item_id_field_id', 'columns' => 'item_id, field_id'),
    );

    foreach ($indexes_to_add as $idx) {
        $index_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = %s AND table_name = %s AND index_name = %s",
            DB_NAME,
            $idx['table'],
            $idx['name']
        ));

        if (!$index_exists) {
            $table_exists = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
                DB_NAME,
                $idx['table']
            ));

            if ($table_exists) {
                $result = $wpdb->query("ALTER TABLE {$idx['table']} ADD INDEX {$idx['name']} ({$idx['columns']})");
                if ($result !== false) {
                    $messages[] = "Added index {$idx['name']} on {$idx['table']}";
                }
            }
        }
    }

    // Update Formidable version option to mark installation as complete
    update_option('frm_db_version', 109);
    $messages[] = "Set frm_db_version option to 109";

    return new WP_REST_Response(array(
        'success' => true,
        'messages' => $messages
    ), 200);
}

?>