<?php
/**
 * Simple script to activate the CASA Enhanced plugin and flush rewrite rules
 * Run this after updating the plugin to ensure all endpoints are registered
 */

// WordPress bootstrap
require_once dirname(__DIR__) . '/wordpress-backend/wp-config.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';

// Activate the plugin if not already active
$plugin_file = 'casa-enhanced/casa-enhanced.php';

if (!is_plugin_active($plugin_file)) {
    $result = activate_plugin($plugin_file);
    if (is_wp_error($result)) {
        echo "❌ Plugin activation failed: " . $result->get_error_message() . "\n";
    } else {
        echo "✅ CASA Enhanced plugin activated successfully!\n";
    }
} else {
    echo "✅ CASA Enhanced plugin is already active\n";
}

// Flush rewrite rules to register new endpoints
flush_rewrite_rules();
echo "✅ WordPress rewrite rules flushed\n";

// Test if tables exist and create them if needed
global $wpdb;
$orgs_table = $wpdb->prefix . 'casa_organizations';
$user_orgs_table = $wpdb->prefix . 'casa_user_organizations';

$tables_exist = [
    'casa_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$orgs_table'") == $orgs_table,
    'casa_user_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$user_orgs_table'") == $user_orgs_table
];

if (!$tables_exist['casa_organizations'] || !$tables_exist['casa_user_organizations']) {
    echo "📊 Creating database tables...\n";
    
    // Call the table creation function from the plugin
    if (function_exists('casa_create_tables')) {
        casa_create_tables();
        echo "✅ Database tables created successfully\n";
    } else {
        echo "❌ casa_create_tables function not found\n";
    }
} else {
    echo "✅ Database tables already exist\n";
}

// Test API endpoints
echo "\n🔗 Testing API endpoints...\n";

// Test the main API route
$api_url = home_url('/wp-json/casa/v1/');
$response = wp_remote_get($api_url);

if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) == 200) {
    echo "✅ CASA API endpoints are accessible\n";
    
    // Check if our new endpoints are registered
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (isset($data['routes']) && isset($data['routes']['/casa/v1/register-organization'])) {
        echo "✅ Organization registration endpoint is registered\n";
    } else {
        echo "❌ Organization registration endpoint is NOT registered\n";
    }
    
    if (isset($data['routes']) && isset($data['routes']['/casa/v1/register-volunteer'])) {
        echo "✅ Volunteer registration endpoint is registered\n";
    } else {
        echo "❌ Volunteer registration endpoint is NOT registered\n";
    }
} else {
    echo "❌ CASA API endpoints are not accessible\n";
}

echo "\n🎉 Plugin activation complete!\n";
echo "🌐 Your CASA multi-tenant system is ready!\n";
echo "📝 Visit /auth/organization-register to create your first organization\n";
?>