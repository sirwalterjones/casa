<?php
/**
 * Test User Profile API
 */

// WordPress configuration
define('WP_USE_THEMES', false);
require_once('/Users/walterjones/Local Sites/casa-backend/app/public/wp-config.php');

echo "<h2>Test User Profile API</h2>";

// Get user by email
$user = get_user_by('email', 'walter@narcrms.net');

if (!$user) {
    echo "User walter@narcrms.net not found!<br>";
    exit;
}

echo "<h3>User ID: {$user->ID}</h3>";

// Simulate the user profile API call
wp_set_current_user($user->ID);

echo "<h3>Current User Roles:</h3>";
echo "Roles: " . implode(', ', $user->roles) . "<br>";

echo "<h3>API Response Simulation:</h3>";
$api_response = array(
    'id' => $user->ID,
    'email' => $user->user_email,
    'firstName' => get_user_meta($user->ID, 'first_name', true),
    'lastName' => get_user_meta($user->ID, 'last_name', true),
    'roles' => array_values($user->roles),
    'capabilities' => array_keys($user->get_role_caps()),
);

echo "<pre>" . json_encode($api_response, JSON_PRETTY_PRINT) . "</pre>";

echo "<h3>Testing casa_get_user_profile function:</h3>";

// Create a mock request object
class MockRequest {
    public function get_param($param) {
        return null;
    }
}

$request = new MockRequest();
$response = casa_get_user_profile($request);

echo "<pre>" . json_encode($response, JSON_PRETTY_PRINT) . "</pre>";
?> 