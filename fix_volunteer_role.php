<?php
/**
 * Fix Volunteer Role Script
 */

// WordPress configuration
define('WP_USE_THEMES', false);
require_once('/Users/walterjones/Local Sites/casa-backend/app/public/wp-config.php');

echo "<h2>Fix Volunteer Role</h2>";

// Get test user
$test_user = get_user_by('email', 'walter@test.com');
if (!$test_user) {
    echo "User walter@test.com not found!<br>";
    exit;
}

echo "Found user: {$test_user->user_email} (ID: {$test_user->ID})<br>";

// Update WordPress role to volunteer
$user = new WP_User($test_user->ID);
echo "Current WordPress roles: " . implode(', ', $user->roles) . "<br>";

// Remove administrator roles
$user->remove_role('casa_administrator');
$user->remove_role('casa_supervisor');
$user->remove_role('administrator');

// Add volunteer role
$user->add_role('casa_volunteer');
echo "Updated WordPress roles: " . implode(', ', $user->roles) . "<br>";

// Update organization role to volunteer
global $wpdb;
$user_org_table = $wpdb->prefix . 'casa_user_organizations';
$wpdb->update(
    $user_org_table,
    ['casa_role' => 'volunteer'],
    [
        'user_id' => $test_user->ID,
        'organization_id' => 20 // Bartow organization ID
    ]
);

echo "Updated organization role to volunteer<br>";

// Verify the update
$user_org = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM $user_org_table WHERE user_id = %d AND organization_id = %d",
    $test_user->ID, 20
));

if ($user_org) {
    echo "Verified user organization role: {$user_org->casa_role}<br>";
} else {
    echo "Failed to verify user organization role!<br>";
}

// Now let's assign the test case to this volunteer
$cases_table = $wpdb->prefix . 'casa_cases';

// Update the test case to be assigned to this volunteer
$test_case = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM $cases_table WHERE case_number LIKE %s AND organization_id = %d",
    'TEST-2025-%', 20
));

if ($test_case) {
    echo "Found test case: {$test_case->case_number}<br>";
    
    // Assign the case to the volunteer
    $wpdb->update(
        $cases_table,
        [
            'assigned_volunteer_id' => $test_user->ID,
            'assignment_date' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ],
        ['id' => $test_case->id]
    );
    
    echo "Assigned case {$test_case->case_number} to volunteer walter@test.com<br>";
    
    // Also update the WordPress post if it exists
    $case_post = get_posts([
        'post_type' => 'casa_case',
        'meta_query' => [
            [
                'key' => 'case_number',
                'value' => $test_case->case_number,
                'compare' => '='
            ]
        ]
    ]);
    
    if ($case_post && count($case_post) > 0) {
        $post_id = $case_post[0]->ID;
        update_post_meta($post_id, 'assigned_volunteer_id', $test_user->ID);
        update_post_meta($post_id, 'assigned_volunteer', $test_user->display_name);
        update_post_meta($post_id, 'assignment_date', current_time('mysql'));
        echo "Also updated WordPress post for case (Post ID: {$post_id})<br>";
    }
} else {
    echo "No test case found to assign to volunteer<br>";
}

echo "<h3>Login Information:</h3>";
echo "Email: walter@test.com<br>";
echo "Password: password123<br>";
echo "Role: Volunteer<br>";
echo "<p>You can now log in with these credentials and view your assigned case.</p>";
?>