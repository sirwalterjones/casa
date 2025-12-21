<?php
/**
 * Simple script to flush WordPress rewrite rules
 * Visit this page in your browser after updating the plugin
 */

// Load WordPress
require_once 'wp-config.php';

// Check if user has admin access
if (!current_user_can('administrator')) {
    wp_die('You need administrator access to run this script.');
}

echo '<h1>CASA Enhanced - Flush Rewrite Rules</h1>';

// Flush rewrite rules
flush_rewrite_rules();
echo '<p>✅ Rewrite rules flushed successfully!</p>';

// Test if our endpoints are now registered
$api_url = home_url('/wp-json/casa/v1/');
$response = wp_remote_get($api_url);

if (!is_wp_error($response)) {
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    echo '<h2>API Endpoint Status:</h2>';
    
    if (isset($data['routes']['/casa/v1/register-organization'])) {
        echo '<p>✅ Organization registration endpoint is now available</p>';
    } else {
        echo '<p>❌ Organization registration endpoint is still not found</p>';
    }
    
    if (isset($data['routes']['/casa/v1/register-volunteer'])) {
        echo '<p>✅ Volunteer registration endpoint is now available</p>';
    } else {
        echo '<p>❌ Volunteer registration endpoint is still not found</p>';
    }
    
    echo '<h2>Test URLs:</h2>';
    echo '<ul>';
    echo '<li><a href="' . home_url('/wp-json/casa/v1/') . '" target="_blank">CASA API Root</a></li>';
    echo '<li><a href="../test-endpoints.html" target="_blank">Endpoint Test Page</a></li>';
    echo '</ul>';
    
} else {
    echo '<p>❌ Could not test API endpoints</p>';
}

echo '<p><a href="' . admin_url('options-general.php?page=casa-enhanced') . '">← Back to CASA Settings</a></p>';
?>