<?php
/**
 * Verify Volunteer Access Script
 */

// WordPress configuration
define('WP_USE_THEMES', false);
require_once('/Users/walterjones/Local Sites/casa-backend/app/public/wp-config.php');

echo "<h2>Verify Volunteer Access</h2>";

// Get test user
$test_user = get_user_by('email', 'walter@test.com');
if (!$test_user) {
    echo "User walter@test.com not found!<br>";
    exit;
}

// Set current user
wp_set_current_user($test_user->ID);
echo "Set current user to: {$test_user->user_email} (ID: {$test_user->ID})<br>";

// Check WordPress roles
$user = new WP_User($test_user->ID);
echo "WordPress roles: " . implode(', ', $user->roles) . "<br>";

// Get user's organization
global $wpdb;
$user_org_table = $wpdb->prefix . 'casa_user_organizations';
$user_org = $wpdb->get_row($wpdb->prepare(
    "SELECT * FROM $user_org_table WHERE user_id = %d AND status = 'active'",
    $test_user->ID
));

if (!$user_org) {
    echo "User is not assigned to any organization!<br>";
    exit;
}

echo "User organization role: {$user_org->casa_role} in organization ID: {$user_org->organization_id}<br>";

// Get assigned cases for the volunteer
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
}

// Test the API endpoint
echo "<h3>Testing Cases API for Volunteer:</h3>";

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

// Test the function
$request = new MockRequest();
$response = casa_get_cases($request);

if ($response && is_object($response) && property_exists($response, 'data')) {
    $data = $response->data;
    if (isset($data['success']) && $data['success'] && isset($data['data']['cases'])) {
        $cases = $data['data']['cases'];
        echo "API returned " . count($cases) . " cases<br>";
        
        if (count($cases) > 0) {
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Case Number</th><th>Child Name</th><th>Assigned To</th></tr>";
            foreach ($cases as $case) {
                echo "<tr>";
                echo "<td>{$case['case_number']}</td>";
                echo "<td>{$case['child_first_name']} {$case['child_last_name']}</td>";
                echo "<td>" . ($case['assigned_volunteer_id'] == $test_user->ID ? 'ME' : 'Other') . "</td>";
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

echo "<h3>Login Instructions:</h3>";
echo "1. Go to <a href='http://localhost:3000/auth/login' target='_blank'>http://localhost:3000/auth/login</a><br>";
echo "2. Login with:<br>";
echo "   - Email: walter@test.com<br>";
echo "   - Password: password123<br>";
echo "3. Navigate to Cases page to view your assigned case<br>";
echo "<p>As a volunteer, you should only see cases assigned to you.</p>";
?>