<?php
/**
 * Check Existing User Script
 */

// WordPress configuration
define('WP_USE_THEMES', false);
require_once('/Users/walterjones/Local Sites/casa-backend/app/public/wp-config.php');

echo "<h2>Check Existing User: walter@test.com</h2>";

// Get test user
$test_user = get_user_by('email', 'walter@test.com');
if (!$test_user) {
    echo "User walter@test.com not found!<br>";
    exit;
}

echo "Found existing user: {$test_user->user_email} (ID: {$test_user->ID})<br>";
echo "Display Name: {$test_user->display_name}<br>";
echo "User Login: {$test_user->user_login}<br>";

// Check WordPress roles
$user = new WP_User($test_user->ID);
echo "Current WordPress roles: " . implode(', ', $user->roles) . "<br>";

// Check organization assignment
global $wpdb;
$user_org_table = $wpdb->prefix . 'casa_user_organizations';
$user_org = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM $user_org_table WHERE user_id = %d",
    $test_user->ID
));

if ($user_org) {
    echo "Organization assignment:<br>";
    echo "- Organization ID: {$user_org->organization_id}<br>";
    echo "- CASA Role: {$user_org->casa_role}<br>";
    echo "- Status: {$user_org->status}<br>";
    echo "- Joined: {$user_org->joined_at}<br>";
} else {
    echo "User is not assigned to any organization!<br>";
}

// Check assigned cases
$cases_table = $wpdb->prefix . 'casa_cases';
$assigned_cases = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM $cases_table WHERE assigned_volunteer_id = %d",
    $test_user->ID
));

echo "<h3>Assigned Cases:</h3>";
echo "Found " . count($assigned_cases) . " assigned cases<br>";

if ($assigned_cases) {
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Case Number</th><th>Child Name</th><th>Status</th><th>Assignment Date</th></tr>";
    foreach ($assigned_cases as $case) {
        echo "<tr>";
        echo "<td>{$case->id}</td>";
        echo "<td>{$case->case_number}</td>";
        echo "<td>{$case->child_first_name} {$case->child_last_name}</td>";
        echo "<td>{$case->status}</td>";
        echo "<td>{$case->assignment_date}</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "No cases assigned to this user.<br>";
}

// Check what the API would return for this user
echo "<h3>Testing API Response for this User:</h3>";

// Set current user
wp_set_current_user($test_user->ID);

// Create a mock request
class MockRequest {
    private $params = [];
    
    public function __construct($params = []) {
        $this->params = $params;
    }
    
    public function get_param($param) {
        return isset($this->params[$param]) ? $this->params[$param] : null;
    }
}

$request = new MockRequest();
$response = casa_get_cases($request);

if ($response && is_object($response) && property_exists($response, 'data')) {
    $data = $response->data;
    if (isset($data['success']) && $data['success'] && isset($data['data']['cases'])) {
        $cases = $data['data']['cases'];
        echo "API returned " . count($cases) . " cases<br>";
        
        if (count($cases) > 0) {
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Case Number</th><th>Child Name</th><th>Status</th><th>Assigned To</th></tr>";
            foreach ($cases as $case) {
                $assigned_to = ($case['assigned_volunteer_id'] == $test_user->ID) ? 'THIS USER' : 'Other User';
                echo "<tr>";
                echo "<td>{$case['case_number']}</td>";
                echo "<td>{$case['child_first_name']} {$case['child_last_name']}</td>";
                echo "<td>{$case['status']}</td>";
                echo "<td>{$assigned_to}</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    } else {
        echo "API response format issue<br>";
        echo "<pre>" . print_r($data, true) . "</pre>";
    }
} else {
    echo "API call failed<br>";
    echo "<pre>" . print_r($response, true) . "</pre>";
}

echo "<h3>Summary:</h3>";
echo "User: walter@test.com exists<br>";
echo "Current status: " . ($user_org && $user_org->casa_role === 'volunteer' ? 'Properly configured as volunteer' : 'Needs role adjustment') . "<br>";
echo "Cases assigned: " . count($assigned_cases) . "<br>";
echo "API access working: " . (isset($cases) && count($cases) > 0 ? 'Yes' : 'No') . "<br>";
?>