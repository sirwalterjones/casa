<?php
/**
 * PA-CASA Test Data Setup
 *
 * Creates comprehensive test data for the PA-CASA organization:
 * - Pennsylvania CASA Program organization
 * - walter@joneswebdesigns.com as admin
 * - 7 volunteers with varied statuses
 * - 10 cases with varied types/statuses
 * - 18 contact log entries
 * - 12 court hearings
 * - 25+ documents
 * - 8 home visit reports
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register the PA-CASA setup endpoint
 */
add_action('rest_api_init', function() {
    register_rest_route('casa/v1', '/admin/setup-pa-casa-data', array(
        'methods' => 'POST',
        'callback' => 'casa_setup_pa_casa_test_data',
        'permission_callback' => '__return_true'
    ));

    // Endpoint to switch user to PA-CASA
    register_rest_route('casa/v1', '/admin/switch-to-pacasa', array(
        'methods' => 'POST',
        'callback' => 'casa_switch_user_to_pacasa',
        'permission_callback' => '__return_true'
    ));
});

/**
 * Switch walter to PA-CASA as PRIMARY organization
 * This updates the database so login returns PA-CASA
 */
function casa_switch_user_to_pacasa($request) {
    global $wpdb;

    $user = get_user_by('email', 'walter@joneswebdesigns.com');
    if (!$user) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User walter@joneswebdesigns.com not found'
        ), 404);
    }

    // Get PA-CASA organization
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';

    $pacasa = $wpdb->get_row("SELECT * FROM $orgs_table WHERE slug = 'pacasa'");

    if (!$pacasa) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'PA-CASA organization not found. Run setup-pa-casa-data first.'
        ), 404);
    }

    // Remove walter from organization 1 (Default/Bartow)
    $wpdb->delete($user_orgs_table, array(
        'user_id' => $user->ID,
        'organization_id' => 1
    ));

    // Ensure walter is in PA-CASA org
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $user_orgs_table WHERE user_id = %d AND organization_id = %d",
        $user->ID, $pacasa->id
    ));

    if (!$existing) {
        $wpdb->insert($user_orgs_table, array(
            'user_id' => $user->ID,
            'organization_id' => $pacasa->id,
            'casa_role' => 'admin',
            'status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'max_cases' => 10,
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ));
    }

    // Get updated user orgs
    $user_orgs = $wpdb->get_results($wpdb->prepare(
        "SELECT uo.*, o.name, o.slug FROM $user_orgs_table uo
         JOIN $orgs_table o ON uo.organization_id = o.id
         WHERE uo.user_id = %d",
        $user->ID
    ));

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Walter is now ONLY in PA-CASA organization. Please log out and log back in.',
        'user_id' => $user->ID,
        'pacasa_org_id' => $pacasa->id,
        'user_organizations' => $user_orgs
    ), 200);
}

/**
 * Main PA-CASA setup function
 */
function casa_setup_pa_casa_test_data($request) {
    global $wpdb;

    $results = array(
        'organization' => null,
        'admin' => null,
        'volunteers' => array(),
        'cases' => array(),
        'contact_logs' => array(),
        'court_hearings' => array(),
        'documents' => array(),
        'home_visits' => array(),
        'errors' => array()
    );

    $now = current_time('mysql');
    $today = date('Y-m-d');

    // ========================================
    // 1. CREATE PA-CASA ORGANIZATION
    // ========================================
    $orgs_table = $wpdb->prefix . 'casa_organizations';

    // Check if organization already exists
    $existing_org = $wpdb->get_row("SELECT * FROM $orgs_table WHERE slug = 'pacasa'");

    if ($existing_org) {
        $organization_id = $existing_org->id;
        $results['organization'] = 'PA-CASA organization already exists (ID: ' . $organization_id . ')';
    } else {
        $wpdb->insert($orgs_table, array(
            'name' => 'Pennsylvania CASA Program',
            'slug' => 'pacasa',
            'domain' => 'pacasa.joneswebdesigns.com',
            'status' => 'active',
            'contact_email' => 'admin@pacasa.org',
            'phone' => '(717) 555-0100',
            'address' => '333 Market Street, Suite 400, Harrisburg, PA 17101',
            'settings' => json_encode(array(
                'court_jurisdictions' => array('Dauphin County', 'Cumberland County', 'York County', 'Lancaster County'),
                'timezone' => 'America/New_York',
                'features' => array('documents', 'contact_logs', 'court_hearings', 'home_visits')
            )),
            'created_at' => $now,
            'updated_at' => $now
        ));
        $organization_id = $wpdb->insert_id;
        $results['organization'] = 'Created PA-CASA organization (ID: ' . $organization_id . ')';
    }

    // ========================================
    // 2. ASSIGN ADMIN USER
    // ========================================
    $admin_email = 'walter@joneswebdesigns.com';
    $admin_user = get_user_by('email', $admin_email);

    if (!$admin_user) {
        // Create the user if they don't exist
        $user_id = wp_create_user($admin_email, wp_generate_password(), $admin_email);
        if (!is_wp_error($user_id)) {
            wp_update_user(array(
                'ID' => $user_id,
                'first_name' => 'Walter',
                'last_name' => 'Jones',
                'display_name' => 'Walter Jones'
            ));
            $admin_user = get_user_by('ID', $user_id);
            $results['admin'] = 'Created admin user: ' . $admin_email;
        } else {
            $results['errors'][] = 'Failed to create admin user: ' . $user_id->get_error_message();
        }
    } else {
        $results['admin'] = 'Admin user already exists: ' . $admin_email;
    }

    if ($admin_user) {
        // Add to casa_user_organizations
        $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
        $existing_mapping = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $user_orgs_table WHERE user_id = %d AND organization_id = %d",
            $admin_user->ID, $organization_id
        ));

        if (!$existing_mapping) {
            $wpdb->insert($user_orgs_table, array(
                'user_id' => $admin_user->ID,
                'organization_id' => $organization_id,
                'casa_role' => 'admin',
                'status' => 'active',
                'background_check_status' => 'approved',
                'background_check_date' => date('Y-m-d H:i:s', strtotime('-6 months')),
                'training_status' => 'completed',
                'training_completion_date' => date('Y-m-d H:i:s', strtotime('-5 months')),
                'max_cases' => 10,
                'created_at' => $now,
                'updated_at' => $now
            ));
            $results['admin'] .= ' - assigned as admin to PA-CASA';
        }
    }

    // ========================================
    // 3. CREATE VOLUNTEERS (7 total)
    // ========================================
    $volunteers_table = $wpdb->prefix . 'casa_volunteers';

    $volunteers_data = array(
        array(
            'first_name' => 'Margaret',
            'last_name' => 'Sullivan',
            'email' => 'margaret.sullivan@example.com',
            'phone' => '(717) 555-0201',
            'volunteer_status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'assigned_cases_count' => 2,
            'date_of_birth' => '1975-04-12',
            'address' => '456 Oak Avenue',
            'city' => 'Harrisburg',
            'state' => 'PA',
            'zip_code' => '17101',
            'emergency_contact_name' => 'Thomas Sullivan',
            'emergency_contact_phone' => '(717) 555-0202',
            'emergency_contact_relationship' => 'Husband',
            'employer' => 'Harrisburg School District',
            'occupation' => 'Retired Teacher',
            'education_level' => 'Masters',
            'languages_spoken' => 'English, Spanish',
            'max_cases' => 3,
            'preferred_schedule' => 'Weekdays, flexible',
            'background_check_date' => date('Y-m-d H:i:s', strtotime('-8 months')),
            'training_completion_date' => date('Y-m-d H:i:s', strtotime('-7 months'))
        ),
        array(
            'first_name' => 'Robert',
            'last_name' => 'Martinez',
            'email' => 'robert.martinez@example.com',
            'phone' => '(717) 555-0203',
            'volunteer_status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'assigned_cases_count' => 3,
            'date_of_birth' => '1968-09-23',
            'address' => '789 Maple Street',
            'city' => 'Camp Hill',
            'state' => 'PA',
            'zip_code' => '17011',
            'emergency_contact_name' => 'Maria Martinez',
            'emergency_contact_phone' => '(717) 555-0204',
            'emergency_contact_relationship' => 'Wife',
            'employer' => 'Self-employed',
            'occupation' => 'Attorney (Retired)',
            'education_level' => 'Doctorate',
            'languages_spoken' => 'English, Spanish',
            'max_cases' => 4,
            'preferred_schedule' => 'Any day except Sundays',
            'background_check_date' => date('Y-m-d H:i:s', strtotime('-12 months')),
            'training_completion_date' => date('Y-m-d H:i:s', strtotime('-11 months'))
        ),
        array(
            'first_name' => 'Jennifer',
            'last_name' => 'Thompson',
            'email' => 'jennifer.thompson@example.com',
            'phone' => '(717) 555-0205',
            'volunteer_status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'assigned_cases_count' => 2,
            'date_of_birth' => '1982-01-15',
            'address' => '321 Pine Road',
            'city' => 'Mechanicsburg',
            'state' => 'PA',
            'zip_code' => '17055',
            'emergency_contact_name' => 'David Thompson',
            'emergency_contact_phone' => '(717) 555-0206',
            'emergency_contact_relationship' => 'Brother',
            'employer' => 'UPMC Pinnacle',
            'occupation' => 'Social Worker',
            'education_level' => 'Masters',
            'languages_spoken' => 'English',
            'max_cases' => 3,
            'preferred_schedule' => 'Evenings and weekends',
            'background_check_date' => date('Y-m-d H:i:s', strtotime('-6 months')),
            'training_completion_date' => date('Y-m-d H:i:s', strtotime('-5 months'))
        ),
        array(
            'first_name' => 'David',
            'last_name' => 'Chen',
            'email' => 'david.chen@example.com',
            'phone' => '(717) 555-0207',
            'volunteer_status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'assigned_cases_count' => 1,
            'date_of_birth' => '1990-06-30',
            'address' => '654 Elm Court',
            'city' => 'Lancaster',
            'state' => 'PA',
            'zip_code' => '17601',
            'emergency_contact_name' => 'Li Chen',
            'emergency_contact_phone' => '(717) 555-0208',
            'emergency_contact_relationship' => 'Father',
            'employer' => 'Lancaster General Health',
            'occupation' => 'Pediatric Nurse',
            'education_level' => 'Bachelors',
            'languages_spoken' => 'English, Mandarin',
            'max_cases' => 2,
            'preferred_schedule' => 'Weekends only',
            'background_check_date' => date('Y-m-d H:i:s', strtotime('-4 months')),
            'training_completion_date' => date('Y-m-d H:i:s', strtotime('-3 months'))
        ),
        array(
            'first_name' => 'Sarah',
            'last_name' => 'Williams',
            'email' => 'sarah.williams@example.com',
            'phone' => '(717) 555-0209',
            'volunteer_status' => 'background_check',
            'background_check_status' => 'in_progress',
            'training_status' => 'pending',
            'assigned_cases_count' => 0,
            'date_of_birth' => '1988-11-08',
            'address' => '987 Cedar Lane',
            'city' => 'York',
            'state' => 'PA',
            'zip_code' => '17401',
            'emergency_contact_name' => 'Karen Williams',
            'emergency_contact_phone' => '(717) 555-0210',
            'emergency_contact_relationship' => 'Mother',
            'employer' => 'York County Schools',
            'occupation' => 'Guidance Counselor',
            'education_level' => 'Masters',
            'languages_spoken' => 'English',
            'max_cases' => 2,
            'preferred_schedule' => 'After school hours',
            'background_check_date' => null,
            'training_completion_date' => null
        ),
        array(
            'first_name' => 'Michael',
            'last_name' => 'Johnson',
            'email' => 'michael.johnson@example.com',
            'phone' => '(717) 555-0211',
            'volunteer_status' => 'training',
            'background_check_status' => 'approved',
            'training_status' => 'in_progress',
            'assigned_cases_count' => 0,
            'date_of_birth' => '1979-03-22',
            'address' => '147 Walnut Street',
            'city' => 'Carlisle',
            'state' => 'PA',
            'zip_code' => '17013',
            'emergency_contact_name' => 'Patricia Johnson',
            'emergency_contact_phone' => '(717) 555-0212',
            'emergency_contact_relationship' => 'Wife',
            'employer' => 'Dickinson College',
            'occupation' => 'Professor',
            'education_level' => 'Doctorate',
            'languages_spoken' => 'English, French',
            'max_cases' => 3,
            'preferred_schedule' => 'Flexible',
            'background_check_date' => date('Y-m-d H:i:s', strtotime('-2 months')),
            'training_completion_date' => null
        ),
        array(
            'first_name' => 'Patricia',
            'last_name' => 'Anderson',
            'email' => 'patricia.anderson@example.com',
            'phone' => '(717) 555-0213',
            'volunteer_status' => 'inactive',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'assigned_cases_count' => 0,
            'date_of_birth' => '1965-07-19',
            'address' => '258 Birch Avenue',
            'city' => 'Hershey',
            'state' => 'PA',
            'zip_code' => '17033',
            'emergency_contact_name' => 'James Anderson',
            'emergency_contact_phone' => '(717) 555-0214',
            'emergency_contact_relationship' => 'Husband',
            'employer' => 'Retired',
            'occupation' => 'Former Nurse',
            'education_level' => 'Bachelors',
            'languages_spoken' => 'English',
            'max_cases' => 0,
            'preferred_schedule' => 'Not currently available',
            'background_check_date' => date('Y-m-d H:i:s', strtotime('-18 months')),
            'training_completion_date' => date('Y-m-d H:i:s', strtotime('-17 months'))
        )
    );

    $volunteer_ids = array();
    foreach ($volunteers_data as $volunteer) {
        // Check if volunteer already exists
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $volunteers_table WHERE email = %s AND organization_id = %d",
            $volunteer['email'], $organization_id
        ));

        if ($existing) {
            $volunteer_ids[$volunteer['email']] = $existing->id;
            continue;
        }

        $wpdb->insert($volunteers_table, array_merge($volunteer, array(
            'organization_id' => $organization_id,
            'created_by' => $admin_user ? $admin_user->ID : 1,
            'created_at' => $now,
            'updated_at' => $now
        )));
        $volunteer_ids[$volunteer['email']] = $wpdb->insert_id;

        // Also create FF entry for Form 2
        if (function_exists('casa_create_ff_entry')) {
            $volunteer_field_map = array(
                'vol_first_name' => 30, 'vol_last_name' => 31, 'vol_email' => 32, 'vol_phone' => 33,
                'vol_dob' => 34, 'vol_address' => 35, 'vol_city' => 36, 'vol_state' => 37, 'vol_zip' => 38,
                'emergency_name' => 39, 'emergency_phone' => 40, 'emergency_relationship' => 41,
                'employer' => 42, 'occupation' => 43, 'education_level' => 44, 'languages' => 45,
                'max_cases' => 48, 'vol_organization_id' => 62
            );

            $ff_data = array(
                'vol_first_name' => $volunteer['first_name'],
                'vol_last_name' => $volunteer['last_name'],
                'vol_email' => $volunteer['email'],
                'vol_phone' => $volunteer['phone'],
                'vol_dob' => $volunteer['date_of_birth'],
                'vol_address' => $volunteer['address'],
                'vol_city' => $volunteer['city'],
                'vol_state' => $volunteer['state'],
                'vol_zip' => $volunteer['zip_code'],
                'emergency_name' => $volunteer['emergency_contact_name'],
                'emergency_phone' => $volunteer['emergency_contact_phone'],
                'emergency_relationship' => $volunteer['emergency_contact_relationship'],
                'employer' => $volunteer['employer'],
                'occupation' => $volunteer['occupation'],
                'education_level' => $volunteer['education_level'],
                'languages' => $volunteer['languages_spoken'],
                'max_cases' => $volunteer['max_cases'],
                'vol_organization_id' => $organization_id
            );
            casa_create_ff_entry(2, $ff_data, $volunteer_field_map, $now);
        }
    }
    $results['volunteers'] = 'Created/verified ' . count($volunteers_data) . ' volunteers';

    // ========================================
    // 4. CREATE CASES (10 total)
    // ========================================
    $cases_table = $wpdb->prefix . 'casa_cases';

    // Map volunteers by name for case assignment
    $sullivan_id = $volunteer_ids['margaret.sullivan@example.com'] ?? null;
    $martinez_id = $volunteer_ids['robert.martinez@example.com'] ?? null;
    $thompson_id = $volunteer_ids['jennifer.thompson@example.com'] ?? null;
    $chen_id = $volunteer_ids['david.chen@example.com'] ?? null;

    $cases_data = array(
        array(
            'case_number' => 'PA-CASA-2024-001',
            'child_first_name' => 'Aiden',
            'child_last_name' => 'Brooks',
            'child_dob' => '2016-03-15',
            'case_type' => 'dependency',
            'status' => 'active',
            'priority' => 'high',
            'assigned_volunteer_id' => $sullivan_id,
            'court_jurisdiction' => 'Dauphin County',
            'assigned_judge' => 'Hon. Richard Palmer',
            'placement_type' => 'foster_home',
            'placement_address' => '123 Foster Care Lane, Harrisburg, PA 17101',
            'case_summary' => 'Child removed from home due to neglect. Parents working on reunification plan. Currently stable in foster placement.',
            'referral_date' => '2024-01-15',
            'assignment_date' => '2024-01-20'
        ),
        array(
            'case_number' => 'PA-CASA-2024-002',
            'child_first_name' => 'Sophia',
            'child_last_name' => 'Rivera',
            'child_dob' => '2014-07-22',
            'case_type' => 'dependency',
            'status' => 'active',
            'priority' => 'medium',
            'assigned_volunteer_id' => $sullivan_id,
            'court_jurisdiction' => 'Dauphin County',
            'assigned_judge' => 'Hon. Richard Palmer',
            'placement_type' => 'relative_placement',
            'placement_address' => '456 Grandparents Way, Harrisburg, PA 17102',
            'case_summary' => 'Placed with maternal grandparents after parental substance abuse. Doing well in school. Goal is long-term guardianship.',
            'referral_date' => '2024-02-01',
            'assignment_date' => '2024-02-10'
        ),
        array(
            'case_number' => 'PA-CASA-2024-003',
            'child_first_name' => 'Ethan',
            'child_last_name' => 'Kowalski',
            'child_dob' => '2012-11-08',
            'case_type' => 'tpr',
            'status' => 'active',
            'priority' => 'high',
            'assigned_volunteer_id' => $martinez_id,
            'court_jurisdiction' => 'Cumberland County',
            'assigned_judge' => 'Hon. Maria Santos',
            'placement_type' => 'foster_home',
            'placement_address' => '789 Caring Family Drive, Camp Hill, PA 17011',
            'case_summary' => 'Termination of Parental Rights proceedings initiated. Child has been in care for 24 months. Prospective adoptive family identified.',
            'referral_date' => '2023-06-15',
            'assignment_date' => '2023-07-01'
        ),
        array(
            'case_number' => 'PA-CASA-2024-004',
            'child_first_name' => 'Olivia',
            'child_last_name' => 'Miller',
            'child_dob' => '2017-05-03',
            'case_type' => 'dependency',
            'status' => 'active',
            'priority' => 'medium',
            'assigned_volunteer_id' => $martinez_id,
            'court_jurisdiction' => 'Cumberland County',
            'assigned_judge' => 'Hon. Maria Santos',
            'placement_type' => 'foster_home',
            'placement_address' => '321 Safe Haven Street, Mechanicsburg, PA 17055',
            'case_summary' => 'Entered care due to domestic violence in home. Mother has completed DV program. Working toward reunification.',
            'referral_date' => '2024-03-01',
            'assignment_date' => '2024-03-15'
        ),
        array(
            'case_number' => 'PA-CASA-2024-005',
            'child_first_name' => 'Noah',
            'child_last_name' => 'Patel',
            'child_dob' => '2015-09-18',
            'case_type' => 'dependency',
            'status' => 'active',
            'priority' => 'low',
            'assigned_volunteer_id' => $martinez_id,
            'court_jurisdiction' => 'York County',
            'assigned_judge' => 'Hon. James Wilson',
            'placement_type' => 'relative_placement',
            'placement_address' => '654 Extended Family Court, York, PA 17401',
            'case_summary' => 'Stable placement with paternal aunt. Case moving toward permanent guardianship. Child thriving academically.',
            'referral_date' => '2024-01-10',
            'assignment_date' => '2024-01-25'
        ),
        array(
            'case_number' => 'PA-CASA-2024-006',
            'child_first_name' => 'Emma',
            'child_last_name' => 'Fischer',
            'child_dob' => '2013-02-14',
            'case_type' => 'guardianship',
            'status' => 'active',
            'priority' => 'medium',
            'assigned_volunteer_id' => $thompson_id,
            'court_jurisdiction' => 'Lancaster County',
            'assigned_judge' => 'Hon. Patricia Lee',
            'placement_type' => 'relative_placement',
            'placement_address' => '987 Forever Home Lane, Lancaster, PA 17601',
            'case_summary' => 'Guardianship with maternal grandmother. Both parents deceased. Stable, loving home. Monitoring for permanent guardianship.',
            'referral_date' => '2024-02-20',
            'assignment_date' => '2024-03-01'
        ),
        array(
            'case_number' => 'PA-CASA-2024-007',
            'child_first_name' => 'Liam',
            'child_last_name' => 'Washington',
            'child_dob' => '2018-08-25',
            'case_type' => 'dependency',
            'status' => 'active',
            'priority' => 'high',
            'assigned_volunteer_id' => $thompson_id,
            'court_jurisdiction' => 'Lancaster County',
            'assigned_judge' => 'Hon. Patricia Lee',
            'placement_type' => 'foster_home',
            'placement_address' => '147 New Beginnings Blvd, Lancaster, PA 17602',
            'case_summary' => 'Young child with developmental delays. Receiving early intervention services. Foster family committed to meeting special needs.',
            'referral_date' => '2024-04-01',
            'assignment_date' => '2024-04-10'
        ),
        array(
            'case_number' => 'PA-CASA-2024-008',
            'child_first_name' => 'Isabella',
            'child_last_name' => 'Garcia',
            'child_dob' => '2011-12-30',
            'case_type' => 'dependency',
            'status' => 'active',
            'priority' => 'medium',
            'assigned_volunteer_id' => $chen_id,
            'court_jurisdiction' => 'York County',
            'assigned_judge' => 'Hon. James Wilson',
            'placement_type' => 'group_home',
            'placement_address' => '258 Youth Services Center, York, PA 17402',
            'case_summary' => 'Teenager with behavioral challenges in group home setting. Receiving counseling. Goal is to find appropriate foster placement.',
            'referral_date' => '2024-03-15',
            'assignment_date' => '2024-04-01'
        ),
        array(
            'case_number' => 'PA-CASA-2024-009',
            'child_first_name' => 'Mason',
            'child_last_name' => 'Taylor',
            'child_dob' => '2016-06-12',
            'case_type' => 'dependency',
            'status' => 'pending',
            'priority' => 'medium',
            'assigned_volunteer_id' => null,
            'court_jurisdiction' => 'Dauphin County',
            'assigned_judge' => 'Hon. Richard Palmer',
            'placement_type' => 'foster_home',
            'placement_address' => '369 Temporary Shelter Road, Harrisburg, PA 17103',
            'case_summary' => 'New case awaiting volunteer assignment. Child recently entered care. Initial assessment completed.',
            'referral_date' => date('Y-m-d', strtotime('-5 days')),
            'assignment_date' => null
        ),
        array(
            'case_number' => 'PA-CASA-2023-045',
            'child_first_name' => 'Charlotte',
            'child_last_name' => 'Adams',
            'child_dob' => '2014-04-08',
            'case_type' => 'dependency',
            'status' => 'closed',
            'priority' => 'low',
            'assigned_volunteer_id' => null,
            'court_jurisdiction' => 'Cumberland County',
            'assigned_judge' => 'Hon. Maria Santos',
            'placement_type' => 'relative_placement',
            'placement_address' => '741 Permanent Home Street, Carlisle, PA 17013',
            'case_summary' => 'Case successfully closed. Child adopted by foster family. Positive outcome achieved.',
            'referral_date' => '2023-03-01',
            'assignment_date' => '2023-03-15'
        )
    );

    $case_ids = array();
    foreach ($cases_data as $case) {
        // Check if case already exists
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $cases_table WHERE case_number = %s AND organization_id = %d",
            $case['case_number'], $organization_id
        ));

        if ($existing) {
            $case_ids[$case['case_number']] = $existing->id;
            continue;
        }

        $wpdb->insert($cases_table, array_merge($case, array(
            'organization_id' => $organization_id,
            'created_by' => $admin_user ? $admin_user->ID : 1,
            'created_at' => $now,
            'updated_at' => $now
        )));
        $case_ids[$case['case_number']] = $wpdb->insert_id;

        // Create FF entry for Form 1
        if (function_exists('casa_create_ff_entry')) {
            $case_field_map = array(
                'child_first_name' => 1, 'child_last_name' => 2, 'child_dob' => 3,
                'case_number' => 6, 'case_type' => 7, 'case_priority' => 8, 'case_status' => 9,
                'referral_date' => 10, 'case_summary' => 11, 'court_jurisdiction' => 12,
                'assigned_judge' => 13, 'current_placement' => 15, 'organization_id' => 23
            );

            $ff_data = array(
                'child_first_name' => $case['child_first_name'],
                'child_last_name' => $case['child_last_name'],
                'child_dob' => $case['child_dob'],
                'case_number' => $case['case_number'],
                'case_type' => ucfirst($case['case_type']),
                'case_priority' => ucfirst($case['priority']),
                'case_status' => ucfirst($case['status']),
                'referral_date' => $case['referral_date'],
                'case_summary' => $case['case_summary'],
                'court_jurisdiction' => $case['court_jurisdiction'],
                'assigned_judge' => $case['assigned_judge'],
                'current_placement' => ucfirst(str_replace('_', ' ', $case['placement_type'])),
                'organization_id' => $organization_id
            );
            casa_create_ff_entry(1, $ff_data, $case_field_map, $now);
        }
    }
    $results['cases'] = 'Created/verified ' . count($cases_data) . ' cases';

    // ========================================
    // 5. CREATE CONTACT LOGS (18 entries)
    // ========================================
    $contact_logs_table = $wpdb->prefix . 'casa_contact_logs';

    $contact_logs_data = array(
        // Case 001 - Aiden Brooks (Sullivan)
        array(
            'case_number' => 'PA-CASA-2024-001',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-3 days')),
            'contact_duration' => 60,
            'contact_person' => 'Aiden, Foster Parents',
            'contact_notes' => 'Monthly home visit with Aiden. He showed me his bedroom and new toys. Foster parents report he is adjusting well and sleeping through the night. School attendance is regular.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Need to follow up on dental appointment scheduling'
        ),
        array(
            'case_number' => 'PA-CASA-2024-001',
            'contact_type' => 'phone_call',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-10 days')),
            'contact_duration' => 15,
            'contact_person' => 'School Counselor Mrs. Peterson',
            'contact_notes' => 'Called school to check on Aiden\'s progress. Counselor reports he is making friends and participating in class. Reading level improving.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 002 - Sophia Rivera (Sullivan)
        array(
            'case_number' => 'PA-CASA-2024-002',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-5 days')),
            'contact_duration' => 45,
            'contact_person' => 'Sophia, Grandparents',
            'contact_notes' => 'Visited Sophia at grandparents\' home. She is excelling in school and has joined the soccer team. Grandparents are supportive but expressed concern about managing homework help.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Research tutoring resources for grandparents'
        ),
        array(
            'case_number' => 'PA-CASA-2024-002',
            'contact_type' => 'court_hearing',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-20 days')),
            'contact_duration' => 90,
            'contact_person' => 'Judge Palmer, DHS Caseworker, Attorney',
            'contact_notes' => 'Attended permanency review hearing. Judge approved continued placement with grandparents. Guardianship petition to be filed next quarter.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 003 - Ethan Kowalski (Martinez)
        array(
            'case_number' => 'PA-CASA-2024-003',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-7 days')),
            'contact_duration' => 75,
            'contact_person' => 'Ethan, Foster Parents (prospective adoptive)',
            'contact_notes' => 'Home visit ahead of TPR hearing. Ethan is thriving and has bonded well with foster family. He expressed excitement about potential adoption. Room is personalized with his interests.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        array(
            'case_number' => 'PA-CASA-2024-003',
            'contact_type' => 'email',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-14 days')),
            'contact_duration' => 10,
            'contact_person' => 'GAL Attorney Stevens',
            'contact_notes' => 'Email exchange with Guardian ad Litem regarding court report preparation. Confirmed recommendation for TPR and adoption.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 004 - Olivia Miller (Martinez)
        array(
            'case_number' => 'PA-CASA-2024-004',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-2 days')),
            'contact_duration' => 50,
            'contact_person' => 'Olivia, Foster Mother',
            'contact_notes' => 'Home visit with Olivia. She showed me her art projects from school. Foster mother reports occasional nightmares but overall good adjustment. Olivia asked about visiting her mother.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Coordinate with DHS about supervised visitation schedule'
        ),
        array(
            'case_number' => 'PA-CASA-2024-004',
            'contact_type' => 'video_call',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-12 days')),
            'contact_duration' => 30,
            'contact_person' => 'Mother\'s Therapist Dr. Morgan',
            'contact_notes' => 'Video conference with mother\'s therapist to discuss reunification progress. Mother attending all sessions and making significant progress in DV recovery.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 005 - Noah Patel (Martinez)
        array(
            'case_number' => 'PA-CASA-2024-005',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-8 days')),
            'contact_duration' => 55,
            'contact_person' => 'Noah, Aunt Jennifer',
            'contact_notes' => 'Routine visit with Noah at aunt\'s home. He is doing exceptionally well academically - all A\'s this quarter. Participating in Boy Scouts. Aunt has stable employment.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 006 - Emma Fischer (Thompson)
        array(
            'case_number' => 'PA-CASA-2024-006',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-4 days')),
            'contact_duration' => 60,
            'contact_person' => 'Emma, Grandmother Ruth',
            'contact_notes' => 'Home visit with Emma at grandmother\'s house. Emma is adjusting well to loss of parents. Grandmother has good support system through church community. Emma attending grief counseling.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Check on grief counseling progress next visit'
        ),
        array(
            'case_number' => 'PA-CASA-2024-006',
            'contact_type' => 'phone_call',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-18 days')),
            'contact_duration' => 20,
            'contact_person' => 'School Principal Mr. Adams',
            'contact_notes' => 'Follow-up call about Emma\'s school performance. Principal reports she is resilient, maintaining grades, and has supportive peer relationships.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 007 - Liam Washington (Thompson)
        array(
            'case_number' => 'PA-CASA-2024-007',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-1 day')),
            'contact_duration' => 70,
            'contact_person' => 'Liam, Foster Parents, Early Intervention Specialist',
            'contact_notes' => 'Joint visit with EI specialist. Liam showing progress with speech therapy. Foster parents implementing recommended activities at home. Developmentally on track for adjusted age.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Request updated IEP for court report'
        ),
        array(
            'case_number' => 'PA-CASA-2024-007',
            'contact_type' => 'court_hearing',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-25 days')),
            'contact_duration' => 60,
            'contact_person' => 'Judge Lee, DHS, Foster Parents',
            'contact_notes' => 'Initial dependency hearing. Judge ordered continued placement with current foster family. EI services to continue. Six-month review scheduled.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Case 008 - Isabella Garcia (Chen)
        array(
            'case_number' => 'PA-CASA-2024-008',
            'contact_type' => 'in_person_visit',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-6 days')),
            'contact_duration' => 45,
            'contact_person' => 'Isabella, Group Home Staff',
            'contact_notes' => 'Visit with Isabella at group home. She is participating in counseling and showing improvement in managing emotions. Staff report fewer behavioral incidents this month.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Explore potential foster placements with therapeutic support'
        ),
        array(
            'case_number' => 'PA-CASA-2024-008',
            'contact_type' => 'video_call',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-15 days')),
            'contact_duration' => 40,
            'contact_person' => 'Isabella\'s Counselor Ms. Rivera',
            'contact_notes' => 'Video session with counselor. Isabella working through trauma history. Counselor recommends trauma-informed foster placement when appropriate match found.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        // Additional contacts
        array(
            'case_number' => 'PA-CASA-2024-001',
            'contact_type' => 'email',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-22 days')),
            'contact_duration' => 5,
            'contact_person' => 'DHS Caseworker Martinez',
            'contact_notes' => 'Email update from caseworker regarding biological father\'s contact request. Reviewing safety concerns before approving any visitation.',
            'follow_up_required' => 1,
            'follow_up_notes' => 'Await DHS decision on father contact'
        ),
        array(
            'case_number' => 'PA-CASA-2024-003',
            'contact_type' => 'court_hearing',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-45 days')),
            'contact_duration' => 120,
            'contact_person' => 'Judge Santos, All Parties',
            'contact_notes' => 'TPR pretrial hearing. All parties present. Trial date set. CASA report submitted recommending termination and adoption by current foster family.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        ),
        array(
            'case_number' => 'PA-CASA-2024-005',
            'contact_type' => 'phone_call',
            'contact_date' => date('Y-m-d H:i:s', strtotime('-30 days')),
            'contact_duration' => 25,
            'contact_person' => 'Father (incarcerated)',
            'contact_notes' => 'Phone call with Noah\'s father at correctional facility. Father supportive of aunt as guardian. Discussed his release timeline and potential future involvement.',
            'follow_up_required' => 0,
            'follow_up_notes' => null
        )
    );

    foreach ($contact_logs_data as $contact) {
        $wpdb->insert($contact_logs_table, array_merge($contact, array(
            'organization_id' => $organization_id,
            'created_by' => $admin_user ? $admin_user->ID : 1,
            'created_at' => $now,
            'updated_at' => $now
        )));

        // Create FF entry for Form 3
        if (function_exists('casa_create_ff_entry')) {
            $contact_field_map = array(
                'contact_case_id' => 70, 'contact_type' => 71, 'contact_date' => 72,
                'duration_minutes' => 74, 'participants' => 76, 'summary' => 78,
                'follow_up_required' => 81, 'follow_up_notes' => 82, 'contact_organization_id' => 87
            );

            $ff_data = array(
                'contact_case_id' => $case_ids[$contact['case_number']] ?? 0,
                'contact_type' => ucfirst(str_replace('_', ' ', $contact['contact_type'])),
                'contact_date' => date('Y-m-d', strtotime($contact['contact_date'])),
                'duration_minutes' => $contact['contact_duration'],
                'participants' => $contact['contact_person'],
                'summary' => $contact['contact_notes'],
                'follow_up_required' => $contact['follow_up_required'],
                'follow_up_notes' => $contact['follow_up_notes'],
                'contact_organization_id' => $organization_id
            );
            casa_create_ff_entry(3, $ff_data, $contact_field_map, $now);
        }
    }
    $results['contact_logs'] = 'Created ' . count($contact_logs_data) . ' contact log entries';

    // ========================================
    // 6. CREATE COURT HEARINGS (12 total - 7 upcoming, 5 past)
    // ========================================
    $hearings_table = $wpdb->prefix . 'casa_court_hearings';

    $hearings_data = array(
        // 7 Upcoming hearings (next 7-60 days)
        array(
            'case_number' => 'PA-CASA-2024-001',
            'child_name' => 'Aiden Brooks',
            'hearing_date' => date('Y-m-d', strtotime('+7 days')),
            'hearing_time' => '09:00:00',
            'hearing_type' => 'Dependency Review',
            'court_room' => 'Courtroom 3A',
            'judge_name' => 'Hon. Richard Palmer',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Margaret Sullivan',
            'notes' => 'Six-month dependency review. CASA report due 5 days prior.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-003',
            'child_name' => 'Ethan Kowalski',
            'hearing_date' => date('Y-m-d', strtotime('+14 days')),
            'hearing_time' => '10:30:00',
            'hearing_type' => 'TPR Trial',
            'court_room' => 'Courtroom 1',
            'judge_name' => 'Hon. Maria Santos',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Robert Martinez',
            'notes' => 'Final TPR hearing. All parties have submitted briefs. Adoption recommendation included in CASA report.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-002',
            'child_name' => 'Sophia Rivera',
            'hearing_date' => date('Y-m-d', strtotime('+21 days')),
            'hearing_time' => '14:00:00',
            'hearing_type' => 'Permanency Review',
            'court_room' => 'Courtroom 3A',
            'judge_name' => 'Hon. Richard Palmer',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Margaret Sullivan',
            'notes' => 'Permanency review to finalize guardianship petition timeline.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-006',
            'child_name' => 'Emma Fischer',
            'hearing_date' => date('Y-m-d', strtotime('+28 days')),
            'hearing_time' => '09:30:00',
            'hearing_type' => 'Guardianship',
            'court_room' => 'Courtroom 2',
            'judge_name' => 'Hon. Patricia Lee',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Jennifer Thompson',
            'notes' => 'Permanent guardianship hearing. Grandmother has completed all requirements.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-004',
            'child_name' => 'Olivia Miller',
            'hearing_date' => date('Y-m-d', strtotime('+35 days')),
            'hearing_time' => '11:00:00',
            'hearing_type' => 'Dependency Review',
            'court_room' => 'Courtroom 1',
            'judge_name' => 'Hon. Maria Santos',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Robert Martinez',
            'notes' => 'Review of reunification progress. Mother has completed DV program.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-008',
            'child_name' => 'Isabella Garcia',
            'hearing_date' => date('Y-m-d', strtotime('+45 days')),
            'hearing_time' => '13:30:00',
            'hearing_type' => 'Permanency Review',
            'court_room' => 'Courtroom 4B',
            'judge_name' => 'Hon. James Wilson',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'David Chen',
            'notes' => 'Review of placement options and therapeutic progress.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-009',
            'child_name' => 'Mason Taylor',
            'hearing_date' => date('Y-m-d', strtotime('+60 days')),
            'hearing_time' => '10:00:00',
            'hearing_type' => 'Dependency Review',
            'court_room' => 'Courtroom 3A',
            'judge_name' => 'Hon. Richard Palmer',
            'status' => 'scheduled',
            'casa_volunteer_assigned' => 'Pending Assignment',
            'notes' => 'Initial dependency review. CASA volunteer assignment needed.'
        ),
        // 5 Past/completed hearings
        array(
            'case_number' => 'PA-CASA-2024-001',
            'child_name' => 'Aiden Brooks',
            'hearing_date' => date('Y-m-d', strtotime('-60 days')),
            'hearing_time' => '09:00:00',
            'hearing_type' => 'Dependency Review',
            'court_room' => 'Courtroom 3A',
            'judge_name' => 'Hon. Richard Palmer',
            'status' => 'completed',
            'casa_volunteer_assigned' => 'Margaret Sullivan',
            'notes' => 'Completed. Continued placement approved. Next hearing scheduled.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-003',
            'child_name' => 'Ethan Kowalski',
            'hearing_date' => date('Y-m-d', strtotime('-45 days')),
            'hearing_time' => '10:30:00',
            'hearing_type' => 'TPR Pretrial',
            'court_room' => 'Courtroom 1',
            'judge_name' => 'Hon. Maria Santos',
            'status' => 'completed',
            'casa_volunteer_assigned' => 'Robert Martinez',
            'notes' => 'Completed. TPR trial date set. All discovery completed.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-007',
            'child_name' => 'Liam Washington',
            'hearing_date' => date('Y-m-d', strtotime('-25 days')),
            'hearing_time' => '14:00:00',
            'hearing_type' => 'Initial Dependency',
            'court_room' => 'Courtroom 2',
            'judge_name' => 'Hon. Patricia Lee',
            'status' => 'completed',
            'casa_volunteer_assigned' => 'Jennifer Thompson',
            'notes' => 'Completed. Dependency established. EI services ordered.'
        ),
        array(
            'case_number' => 'PA-CASA-2023-045',
            'child_name' => 'Charlotte Adams',
            'hearing_date' => date('Y-m-d', strtotime('-90 days')),
            'hearing_time' => '11:00:00',
            'hearing_type' => 'Adoption Finalization',
            'court_room' => 'Courtroom 1',
            'judge_name' => 'Hon. Maria Santos',
            'status' => 'completed',
            'casa_volunteer_assigned' => 'Patricia Anderson',
            'notes' => 'Completed. Adoption finalized! Case closed with positive outcome.'
        ),
        array(
            'case_number' => 'PA-CASA-2024-002',
            'child_name' => 'Sophia Rivera',
            'hearing_date' => date('Y-m-d', strtotime('-20 days')),
            'hearing_time' => '14:00:00',
            'hearing_type' => 'Permanency Review',
            'court_room' => 'Courtroom 3A',
            'judge_name' => 'Hon. Richard Palmer',
            'status' => 'completed',
            'casa_volunteer_assigned' => 'Margaret Sullivan',
            'notes' => 'Completed. Guardianship plan approved. Petition to be filed.'
        )
    );

    foreach ($hearings_data as $hearing) {
        $wpdb->insert($hearings_table, array_merge($hearing, array(
            'organization_id' => $organization_id,
            'created_by' => $admin_user ? $admin_user->ID : 1,
            'created_at' => $now,
            'updated_at' => $now
        )));
    }
    $results['court_hearings'] = 'Created ' . count($hearings_data) . ' court hearings (7 upcoming, 5 completed)';

    // ========================================
    // 7. CREATE DOCUMENTS (25+ entries)
    // ========================================
    $documents_table = $wpdb->prefix . 'casa_documents';

    $documents_data = array(
        // Case 001 - Aiden Brooks
        array('case_number' => 'PA-CASA-2024-001', 'child_name' => 'Aiden Brooks', 'document_type' => 'Court Order', 'document_name' => 'Initial Dependency Order', 'description' => 'Court order establishing dependency status', 'uploaded_by' => 'Margaret Sullivan'),
        array('case_number' => 'PA-CASA-2024-001', 'child_name' => 'Aiden Brooks', 'document_type' => 'Assessment', 'document_name' => 'Family Assessment Report', 'description' => 'Initial family assessment by DHS', 'uploaded_by' => 'DHS Caseworker'),
        array('case_number' => 'PA-CASA-2024-001', 'child_name' => 'Aiden Brooks', 'document_type' => 'School Record', 'document_name' => 'School Enrollment Records', 'description' => 'Enrollment and attendance records', 'uploaded_by' => 'Margaret Sullivan'),
        // Case 002 - Sophia Rivera
        array('case_number' => 'PA-CASA-2024-002', 'child_name' => 'Sophia Rivera', 'document_type' => 'Court Order', 'document_name' => 'Placement Order with Grandparents', 'description' => 'Court order for relative placement', 'uploaded_by' => 'Margaret Sullivan'),
        array('case_number' => 'PA-CASA-2024-002', 'child_name' => 'Sophia Rivera', 'document_type' => 'School Record', 'document_name' => 'Report Card - Fall Semester', 'description' => 'Academic progress report', 'uploaded_by' => 'Margaret Sullivan'),
        array('case_number' => 'PA-CASA-2024-002', 'child_name' => 'Sophia Rivera', 'document_type' => 'Medical Record', 'document_name' => 'Well-Child Visit Summary', 'description' => 'Annual pediatric checkup documentation', 'uploaded_by' => 'Margaret Sullivan'),
        // Case 003 - Ethan Kowalski
        array('case_number' => 'PA-CASA-2024-003', 'child_name' => 'Ethan Kowalski', 'document_type' => 'Legal Document', 'document_name' => 'TPR Petition', 'description' => 'Termination of Parental Rights petition filed', 'uploaded_by' => 'Robert Martinez'),
        array('case_number' => 'PA-CASA-2024-003', 'child_name' => 'Ethan Kowalski', 'document_type' => 'Court Order', 'document_name' => 'TPR Pretrial Order', 'description' => 'Order from pretrial hearing setting trial date', 'uploaded_by' => 'Robert Martinez'),
        array('case_number' => 'PA-CASA-2024-003', 'child_name' => 'Ethan Kowalski', 'document_type' => 'Assessment', 'document_name' => 'Bonding Assessment', 'description' => 'Psychological bonding assessment with foster family', 'uploaded_by' => 'Dr. Williams'),
        array('case_number' => 'PA-CASA-2024-003', 'child_name' => 'Ethan Kowalski', 'document_type' => 'Assessment', 'document_name' => 'CASA Court Report', 'description' => 'CASA recommendation report for TPR hearing', 'uploaded_by' => 'Robert Martinez'),
        // Case 004 - Olivia Miller
        array('case_number' => 'PA-CASA-2024-004', 'child_name' => 'Olivia Miller', 'document_type' => 'Court Order', 'document_name' => 'Emergency Removal Order', 'description' => 'Emergency removal due to domestic violence', 'uploaded_by' => 'Robert Martinez'),
        array('case_number' => 'PA-CASA-2024-004', 'child_name' => 'Olivia Miller', 'document_type' => 'Assessment', 'document_name' => 'Mother DV Program Completion', 'description' => 'Certificate of completion for DV intervention', 'uploaded_by' => 'DHS Caseworker'),
        array('case_number' => 'PA-CASA-2024-004', 'child_name' => 'Olivia Miller', 'document_type' => 'Medical Record', 'document_name' => 'Therapy Progress Notes', 'description' => 'Child counseling session summaries', 'uploaded_by' => 'Robert Martinez'),
        // Case 005 - Noah Patel
        array('case_number' => 'PA-CASA-2024-005', 'child_name' => 'Noah Patel', 'document_type' => 'Court Order', 'document_name' => 'Temporary Custody Order', 'description' => 'Custody granted to paternal aunt', 'uploaded_by' => 'Robert Martinez'),
        array('case_number' => 'PA-CASA-2024-005', 'child_name' => 'Noah Patel', 'document_type' => 'School Record', 'document_name' => 'Honor Roll Certificate', 'description' => 'Academic achievement recognition', 'uploaded_by' => 'Robert Martinez'),
        // Case 006 - Emma Fischer
        array('case_number' => 'PA-CASA-2024-006', 'child_name' => 'Emma Fischer', 'document_type' => 'Legal Document', 'document_name' => 'Guardianship Petition', 'description' => 'Petition for permanent guardianship', 'uploaded_by' => 'Jennifer Thompson'),
        array('case_number' => 'PA-CASA-2024-006', 'child_name' => 'Emma Fischer', 'document_type' => 'Court Order', 'document_name' => 'Temporary Guardianship Order', 'description' => 'Interim guardianship with grandmother', 'uploaded_by' => 'Jennifer Thompson'),
        array('case_number' => 'PA-CASA-2024-006', 'child_name' => 'Emma Fischer', 'document_type' => 'Medical Record', 'document_name' => 'Grief Counseling Records', 'description' => 'Therapy documentation for bereavement', 'uploaded_by' => 'Jennifer Thompson'),
        // Case 007 - Liam Washington
        array('case_number' => 'PA-CASA-2024-007', 'child_name' => 'Liam Washington', 'document_type' => 'Court Order', 'document_name' => 'Initial Dependency Order', 'description' => 'Dependency adjudication order', 'uploaded_by' => 'Jennifer Thompson'),
        array('case_number' => 'PA-CASA-2024-007', 'child_name' => 'Liam Washington', 'document_type' => 'Medical Record', 'document_name' => 'Early Intervention Evaluation', 'description' => 'Developmental assessment and EI eligibility', 'uploaded_by' => 'Jennifer Thompson'),
        array('case_number' => 'PA-CASA-2024-007', 'child_name' => 'Liam Washington', 'document_type' => 'Assessment', 'document_name' => 'IEP Initial Evaluation', 'description' => 'Individual Education Plan evaluation', 'uploaded_by' => 'School District'),
        array('case_number' => 'PA-CASA-2024-007', 'child_name' => 'Liam Washington', 'document_type' => 'Medical Record', 'document_name' => 'Speech Therapy Progress', 'description' => 'Quarterly speech therapy progress report', 'uploaded_by' => 'Jennifer Thompson'),
        // Case 008 - Isabella Garcia
        array('case_number' => 'PA-CASA-2024-008', 'child_name' => 'Isabella Garcia', 'document_type' => 'Court Order', 'document_name' => 'Dependency Order', 'description' => 'Order for group home placement', 'uploaded_by' => 'David Chen'),
        array('case_number' => 'PA-CASA-2024-008', 'child_name' => 'Isabella Garcia', 'document_type' => 'Medical Record', 'document_name' => 'Psychiatric Evaluation', 'description' => 'Mental health assessment and treatment plan', 'uploaded_by' => 'David Chen'),
        array('case_number' => 'PA-CASA-2024-008', 'child_name' => 'Isabella Garcia', 'document_type' => 'Assessment', 'document_name' => 'Trauma Assessment', 'description' => 'Comprehensive trauma history and recommendations', 'uploaded_by' => 'Group Home Staff'),
        // Case 009 - Mason Taylor
        array('case_number' => 'PA-CASA-2024-009', 'child_name' => 'Mason Taylor', 'document_type' => 'Court Order', 'document_name' => 'Emergency Custody Order', 'description' => 'Initial emergency removal order', 'uploaded_by' => 'DHS Caseworker'),
        array('case_number' => 'PA-CASA-2024-009', 'child_name' => 'Mason Taylor', 'document_type' => 'Assessment', 'document_name' => 'Initial Assessment', 'description' => 'Intake assessment documentation', 'uploaded_by' => 'DHS Caseworker')
    );

    foreach ($documents_data as $document) {
        $wpdb->insert($documents_table, array_merge($document, array(
            'organization_id' => $organization_id,
            'file_name' => sanitize_file_name($document['document_name']) . '.pdf',
            'file_size' => rand(50000, 500000),
            'file_url' => '/wp-content/uploads/casa-documents/' . sanitize_file_name($document['document_name']) . '.pdf',
            'upload_date' => date('Y-m-d H:i:s', strtotime('-' . rand(1, 90) . ' days')),
            'is_confidential' => ($document['document_type'] === 'Medical Record') ? 1 : 0,
            'created_at' => $now,
            'updated_at' => $now
        )));

        // Create FF entry for Form 5
        if (function_exists('casa_create_ff_entry')) {
            $doc_field_map = array(
                'doc_case_id' => 110, 'doc_type' => 111, 'doc_name' => 112,
                'doc_description' => 113, 'doc_confidential' => 114, 'doc_organization_id' => 116
            );

            $ff_data = array(
                'doc_case_id' => $case_ids[$document['case_number']] ?? 0,
                'doc_type' => $document['document_type'],
                'doc_name' => $document['document_name'],
                'doc_description' => $document['description'],
                'doc_confidential' => ($document['document_type'] === 'Medical Record') ? '1' : '0',
                'doc_organization_id' => $organization_id
            );
            casa_create_ff_entry(5, $ff_data, $doc_field_map, $now);
        }
    }
    $results['documents'] = 'Created ' . count($documents_data) . ' document entries';

    // ========================================
    // 8. CREATE HOME VISIT REPORTS (8 reports)
    // ========================================
    // Home visits go through Form 4 (Home Visit Report Form)

    $home_visits_data = array(
        array(
            'case_id' => $case_ids['PA-CASA-2024-001'] ?? 1,
            'volunteer_id' => $sullivan_id,
            'visit_date' => date('Y-m-d', strtotime('-3 days')),
            'visit_duration' => 1.5,
            'visit_location' => '123 Foster Care Lane, Harrisburg, PA',
            'visit_attendees' => 'Aiden Brooks, Mary and John Foster (foster parents)',
            'visit_observations' => 'Home is clean and well-maintained. Aiden has his own bedroom decorated with his favorite characters. Good supply of food, clothing appropriate for season.',
            'child_wellbeing' => 'Aiden appears happy and well-adjusted. Good rapport with foster parents. Making eye contact, engaging in conversation, showed me his favorite toys.',
            'placement_stability' => 'Placement is stable. Foster parents committed to providing long-term care. No signs of disruption concerns.',
            'safety_concerns' => 'No safety concerns observed. Home is childproofed appropriately. Medications stored securely.',
            'educational_progress' => 'Attending school regularly. Reading at grade level. Teacher reports good participation.',
            'social_development' => 'Making friends at school. Joined youth soccer league. Getting along well with foster siblings.',
            'emotional_wellbeing' => 'Occasional questions about birth family but overall adjusting well. No behavioral concerns.',
            'physical_health' => 'Up to date on immunizations. Recent dental checkup scheduled. Good appetite and sleep patterns.',
            'visit_recommendations' => 'Continue current placement. Schedule next visit in 30 days. Follow up on dental appointment.',
            'visit_follow_up' => 1,
            'visit_follow_up_notes' => 'Dental appointment confirmation needed',
            'visit_status' => 'Approved'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-002'] ?? 2,
            'volunteer_id' => $sullivan_id,
            'visit_date' => date('Y-m-d', strtotime('-5 days')),
            'visit_duration' => 1.0,
            'visit_location' => '456 Grandparents Way, Harrisburg, PA',
            'visit_attendees' => 'Sophia Rivera, Rosa and Carlos Rivera (grandparents)',
            'visit_observations' => 'Well-kept home in quiet neighborhood. Sophia has dedicated study space. Grandparents have child-appropriate routines established.',
            'child_wellbeing' => 'Sophia is thriving. Excited about school and extracurricular activities. Strong bond with grandparents evident.',
            'placement_stability' => 'Very stable placement. Grandparents fully committed to permanent guardianship.',
            'safety_concerns' => 'None identified. Home is safe and age-appropriate.',
            'educational_progress' => 'Honor roll student. Joined soccer team. Active in school activities.',
            'social_development' => 'Well-adjusted socially. Has close friendships. Good peer relationships.',
            'emotional_wellbeing' => 'Emotionally healthy. Open about feelings. Attending optional counseling monthly.',
            'physical_health' => 'Healthy and active. Regular pediatric care. No health concerns.',
            'visit_recommendations' => 'Support guardianship petition. Continue monitoring during transition.',
            'visit_follow_up' => 0,
            'visit_follow_up_notes' => null,
            'visit_status' => 'Approved'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-003'] ?? 3,
            'volunteer_id' => $martinez_id,
            'visit_date' => date('Y-m-d', strtotime('-7 days')),
            'visit_duration' => 1.5,
            'visit_location' => '789 Caring Family Drive, Camp Hill, PA',
            'visit_attendees' => 'Ethan Kowalski, Sarah and Mark Davis (prospective adoptive parents)',
            'visit_observations' => 'Beautiful home with clear signs of permanency. Ethan\'s artwork displayed. Family photos include Ethan.',
            'child_wellbeing' => 'Ethan is happy and secure. Calls foster parents "mom and dad". Looking forward to adoption.',
            'placement_stability' => 'Highly stable. Pre-adoptive placement proceeding smoothly.',
            'safety_concerns' => 'None. Home exceeds all safety standards.',
            'educational_progress' => 'Excellent progress in school. Overcoming earlier academic gaps.',
            'social_development' => 'Strong friendships. Active in church youth group. Plays basketball.',
            'emotional_wellbeing' => 'Emotionally secure. Understands adoption process. Excited about permanent family.',
            'physical_health' => 'Healthy. All medical needs being met.',
            'visit_recommendations' => 'Strongly support adoption. Recommend expedited finalization.',
            'visit_follow_up' => 0,
            'visit_follow_up_notes' => null,
            'visit_status' => 'Approved'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-004'] ?? 4,
            'volunteer_id' => $martinez_id,
            'visit_date' => date('Y-m-d', strtotime('-2 days')),
            'visit_duration' => 1.0,
            'visit_location' => '321 Safe Haven Street, Mechanicsburg, PA',
            'visit_attendees' => 'Olivia Miller, Janet Smith (foster mother)',
            'visit_observations' => 'Warm, nurturing foster home. Olivia has decorated her room. Signs of stability and routine.',
            'child_wellbeing' => 'Olivia is doing better. Still processing trauma but making progress.',
            'placement_stability' => 'Stable current placement. Foster mother trauma-informed and supportive.',
            'safety_concerns' => 'None in current placement. Monitored visitation with mother appropriate.',
            'educational_progress' => 'Attending school regularly. Grades improving. Enjoys art class.',
            'social_development' => 'Making friends slowly. Some social anxiety but improving.',
            'emotional_wellbeing' => 'Nightmares decreasing. Responds well to therapy. Asks about mother.',
            'physical_health' => 'Healthy. Regular medical care. Good appetite.',
            'visit_recommendations' => 'Continue therapeutic services. Support graduated reunification when appropriate.',
            'visit_follow_up' => 1,
            'visit_follow_up_notes' => 'Coordinate with DHS on visitation schedule',
            'visit_status' => 'Submitted'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-006'] ?? 6,
            'volunteer_id' => $thompson_id,
            'visit_date' => date('Y-m-d', strtotime('-4 days')),
            'visit_duration' => 1.25,
            'visit_location' => '987 Forever Home Lane, Lancaster, PA',
            'visit_attendees' => 'Emma Fischer, Ruth Fischer (grandmother)',
            'visit_observations' => 'Comfortable home with strong sense of family. Emma\'s parents\' photos displayed respectfully.',
            'child_wellbeing' => 'Emma is resilient. Processing grief with support. Strong bond with grandmother.',
            'placement_stability' => 'Very stable. Grandmother fully committed to raising Emma.',
            'safety_concerns' => 'None. Safe, loving environment.',
            'educational_progress' => 'Maintaining good grades despite circumstances. Supportive school environment.',
            'social_development' => 'Peer support strong. Church community involvement helpful.',
            'emotional_wellbeing' => 'Attending grief counseling. Open about missing parents. Healthy coping.',
            'physical_health' => 'Healthy. Regular pediatric care maintained.',
            'visit_recommendations' => 'Support permanent guardianship. Continue grief counseling support.',
            'visit_follow_up' => 1,
            'visit_follow_up_notes' => 'Follow up on counseling progress',
            'visit_status' => 'Approved'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-007'] ?? 7,
            'volunteer_id' => $thompson_id,
            'visit_date' => date('Y-m-d', strtotime('-1 day')),
            'visit_duration' => 1.5,
            'visit_location' => '147 New Beginnings Blvd, Lancaster, PA',
            'visit_attendees' => 'Liam Washington, Amy and Bob Johnson (foster parents), EI Specialist Sarah',
            'visit_observations' => 'Home well-equipped for child with developmental needs. Sensory-friendly spaces. Therapy materials available.',
            'child_wellbeing' => 'Liam is making excellent progress. Responding well to early intervention.',
            'placement_stability' => 'Stable placement with experienced therapeutic foster family.',
            'safety_concerns' => 'None. Home adapted for special needs.',
            'educational_progress' => 'IEP in place. Attending specialized preschool. Meeting developmental milestones.',
            'social_development' => 'Improving with support. Playing with foster siblings.',
            'emotional_wellbeing' => 'Happy and secure. Bonding well with foster family.',
            'physical_health' => 'Under care of developmental pediatrician. All services coordinated.',
            'visit_recommendations' => 'Continue EI services. Support current placement. Update IEP for court.',
            'visit_follow_up' => 1,
            'visit_follow_up_notes' => 'Request updated IEP documentation',
            'visit_status' => 'Submitted'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-008'] ?? 8,
            'volunteer_id' => $chen_id,
            'visit_date' => date('Y-m-d', strtotime('-6 days')),
            'visit_duration' => 1.0,
            'visit_location' => '258 Youth Services Center, York, PA',
            'visit_attendees' => 'Isabella Garcia, Linda Brown (group home supervisor)',
            'visit_observations' => 'Clean, structured group home environment. Isabella has personalized her space.',
            'child_wellbeing' => 'Isabella is improving. Fewer behavioral incidents. Engaging in programming.',
            'placement_stability' => 'Stable in current setting but long-term foster placement goal remains.',
            'safety_concerns' => 'None in current environment. Self-harm risk being monitored.',
            'educational_progress' => 'Attending on-site school. Credit recovery in progress.',
            'social_development' => 'Learning healthy relationship skills. Positive peer relationships developing.',
            'emotional_wellbeing' => 'Actively engaged in therapy. Processing trauma history. Making progress.',
            'physical_health' => 'Medication management stable. Regular health monitoring.',
            'visit_recommendations' => 'Continue therapeutic support. Explore TFC placement options.',
            'visit_follow_up' => 1,
            'visit_follow_up_notes' => 'Research therapeutic foster care options',
            'visit_status' => 'Approved'
        ),
        array(
            'case_id' => $case_ids['PA-CASA-2024-005'] ?? 5,
            'volunteer_id' => $martinez_id,
            'visit_date' => date('Y-m-d', strtotime('-8 days')),
            'visit_duration' => 1.0,
            'visit_location' => '654 Extended Family Court, York, PA',
            'visit_attendees' => 'Noah Patel, Jennifer Patel (aunt)',
            'visit_observations' => 'Well-maintained home in good neighborhood. Noah has his own room. Family photos displayed.',
            'child_wellbeing' => 'Noah is thriving. Excellent student. Happy and well-adjusted.',
            'placement_stability' => 'Very stable. Aunt provides excellent care. Ready for permanent guardianship.',
            'safety_concerns' => 'None identified.',
            'educational_progress' => 'All A grades. Active in Boy Scouts. Academic competitions.',
            'social_development' => 'Well-adjusted. Strong friendships. Leadership qualities emerging.',
            'emotional_wellbeing' => 'Healthy emotional development. Maintains contact with incarcerated father.',
            'physical_health' => 'Excellent health. Regular checkups. Active lifestyle.',
            'visit_recommendations' => 'Support guardianship petition. Exemplary relative placement.',
            'visit_follow_up' => 0,
            'visit_follow_up_notes' => null,
            'visit_status' => 'Approved'
        )
    );

    // Create FF entries for home visits (Form 4)
    if (function_exists('casa_create_ff_entry')) {
        $home_visit_field_map = array(
            'visit_case_id' => 90, 'visit_volunteer_id' => 91, 'visit_date' => 92,
            'visit_duration' => 93, 'visit_location' => 94, 'visit_attendees' => 95,
            'visit_observations' => 96, 'child_wellbeing' => 97, 'placement_stability' => 98,
            'safety_concerns' => 99, 'educational_progress' => 100, 'social_development' => 101,
            'emotional_wellbeing' => 102, 'physical_health' => 103, 'visit_recommendations' => 104,
            'visit_follow_up' => 105, 'visit_follow_up_notes' => 106, 'visit_status' => 107,
            'visit_organization_id' => 108
        );

        foreach ($home_visits_data as $visit) {
            $ff_data = array(
                'visit_case_id' => $visit['case_id'],
                'visit_volunteer_id' => $visit['volunteer_id'],
                'visit_date' => $visit['visit_date'],
                'visit_duration' => $visit['visit_duration'],
                'visit_location' => $visit['visit_location'],
                'visit_attendees' => $visit['visit_attendees'],
                'visit_observations' => $visit['visit_observations'],
                'child_wellbeing' => $visit['child_wellbeing'],
                'placement_stability' => $visit['placement_stability'],
                'safety_concerns' => $visit['safety_concerns'],
                'educational_progress' => $visit['educational_progress'],
                'social_development' => $visit['social_development'],
                'emotional_wellbeing' => $visit['emotional_wellbeing'],
                'physical_health' => $visit['physical_health'],
                'visit_recommendations' => $visit['visit_recommendations'],
                'visit_follow_up' => $visit['visit_follow_up'],
                'visit_follow_up_notes' => $visit['visit_follow_up_notes'],
                'visit_status' => $visit['visit_status'],
                'visit_organization_id' => $organization_id
            );
            casa_create_ff_entry(4, $ff_data, $home_visit_field_map, $now);
        }
    }
    $results['home_visits'] = 'Created ' . count($home_visits_data) . ' home visit reports';

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'PA-CASA test data setup complete',
        'organization_id' => $organization_id,
        'data' => $results
    ), 200);
}
