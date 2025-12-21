<?php
/**
 * Script to flush WordPress rewrite rules and reactivate the CASA Enhanced plugin
 */

// Load WordPress
require_once('wordpress-backend/wp-load.php');

echo "Flushing rewrite rules...\n";
flush_rewrite_rules();

echo "Deactivating CASA Enhanced plugin...\n";
deactivate_plugins('casa-enhanced/casa-enhanced.php');

echo "Activating CASA Enhanced plugin...\n";
activate_plugin('casa-enhanced/casa-enhanced.php');

echo "Flushing rewrite rules again...\n";
flush_rewrite_rules();

echo "Testing CASA endpoint...\n";
$response = wp_remote_get(home_url('/wp-json/casa/v1/cases'));
if (!is_wp_error($response)) {
    echo "CASA endpoint working: " . wp_remote_retrieve_response_code($response) . "\n";
} else {
    echo "CASA endpoint error: " . $response->get_error_message() . "\n";
}

echo "Testing Formidable endpoint...\n";
$response = wp_remote_get(home_url('/wp-json/casa/v1/formidable/test'));
if (!is_wp_error($response)) {
    echo "Formidable endpoint working: " . wp_remote_retrieve_response_code($response) . "\n";
    echo "Response: " . wp_remote_retrieve_body($response) . "\n";
} else {
    echo "Formidable endpoint error: " . $response->get_error_message() . "\n";
}

echo "Done!\n";
?>


