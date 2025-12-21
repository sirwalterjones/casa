<?php
/**
 * Check User Roles Script
 */

// WordPress configuration
define('WP_USE_THEMES', false);
require_once('/Users/walterjones/Local Sites/casa-backend/app/public/wp-config.php');

global $wpdb;

echo "<h2>Detailed User Role Check</h2>";

// Get user by email
$user = get_user_by('email', 'walter@narcrms.net');

if (!$user) {
    echo "User walter@narcrms.net not found!<br>";
    exit;
}

echo "<h3>User Information:</h3>";
echo "ID: {$user->ID}<br>";
echo "Email: {$user->user_email}<br>";
echo "Display Name: {$user->display_name}<br>";

echo "<h3>WordPress User Meta:</h3>";
$user_meta = get_user_meta($user->ID);
echo "<pre>" . print_r($user_meta, true) . "</pre>";

echo "<h3>WordPress Roles:</h3>";
echo "Roles: " . implode(', ', $user->roles) . "<br>";
echo "Capabilities: " . implode(', ', array_keys($user->get_role_caps())) . "<br>";

echo "<h3>WordPress User Roles Table:</h3>";
$user_roles = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$wpdb->prefix}usermeta WHERE user_id = %d AND meta_key LIKE '%capabilities%'",
    $user->ID
));
echo "<pre>" . print_r($user_roles, true) . "</pre>";

echo "<h3>CASA User Organizations:</h3>";
$casa_roles = $wpdb->get_results($wpdb->prepare(
    "SELECT * FROM {$wpdb->prefix}casa_user_organizations WHERE user_id = %d",
    $user->ID
));
echo "<pre>" . print_r($casa_roles, true) . "</pre>";

echo "<h3>All WordPress Roles:</h3>";
$all_roles = wp_roles()->get_names();
echo "<pre>" . print_r($all_roles, true) . "</pre>";

echo "<h3>User Capabilities Check:</h3>";
echo "Has casa_administrator capability: " . (user_can($user->ID, 'casa_administrator') ? 'YES' : 'NO') . "<br>";
echo "Has administrator capability: " . (user_can($user->ID, 'administrator') ? 'YES' : 'NO') . "<br>";
echo "Has volunteer capability: " . (user_can($user->ID, 'volunteer') ? 'YES' : 'NO') . "<br>";

echo "<h3>API Response Simulation:</h3>";
$api_response = array(
    'id' => $user->ID,
    'email' => $user->user_email,
    'firstName' => get_user_meta($user->ID, 'first_name', true),
    'lastName' => get_user_meta($user->ID, 'last_name', true),
    'roles' => array_values($user->roles),
    'capabilities' => array_keys($user->get_role_caps()),
);
echo "<pre>" . print_r($api_response, true) . "</pre>";
?> 