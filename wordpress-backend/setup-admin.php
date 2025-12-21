<?php
/**
 * Admin Setup Script - Creates initial admin user for CASA
 * This script should be run once and then removed for security
 */

// Load WordPress
require_once(__DIR__ . '/wp-load.php');

// Check if already set up
$admin_email = 'walter@joneswebdesigns.com';
$existing_user = get_user_by('email', $admin_email);

header('Content-Type: application/json');

if ($existing_user) {
    echo json_encode([
        'success' => true,
        'message' => 'Admin user already exists',
        'user_id' => $existing_user->ID,
        'email' => $admin_email
    ]);
    exit;
}

// Generate a secure password
$password = wp_generate_password(16, true, true);

// Create the admin user
$user_id = wp_create_user(
    'walter_admin',
    $password,
    $admin_email
);

if (is_wp_error($user_id)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $user_id->get_error_message()
    ]);
    exit;
}

// Set as administrator
$user = new WP_User($user_id);
$user->set_role('administrator');

// Set user meta
update_user_meta($user_id, 'first_name', 'Walter');
update_user_meta($user_id, 'last_name', 'Jones');

// Set CASA role
update_user_meta($user_id, 'casa_role', 'admin');
update_user_meta($user_id, 'casa_status', 'active');

echo json_encode([
    'success' => true,
    'message' => 'Admin user created successfully',
    'user_id' => $user_id,
    'email' => $admin_email,
    'username' => 'walter_admin',
    'password' => $password,
    'important' => 'SAVE THIS PASSWORD! It will not be shown again.'
]);
