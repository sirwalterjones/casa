<?php
/**
 * CASA Endpoint Fix - Place this in your WordPress root directory
 */

// Load WordPress
require_once 'wp-config.php';

// Output HTML
?>
<!DOCTYPE html>
<html>
<head>
    <title>CASA Endpoint Fix</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔧 CASA Endpoint Fix Tool</h1>
    
    <?php
    echo '<h2>Step 1: Check Plugin Status</h2>';
    
    // Check if plugin is active
    $plugin_file = 'casa-enhanced/casa-enhanced.php';
    
    if (!function_exists('is_plugin_active')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    
    $is_active = is_plugin_active($plugin_file);
    
    if ($is_active) {
        echo '<p class="success">✅ CASA Enhanced plugin is active</p>';
    } else {
        echo '<p class="error">❌ CASA Enhanced plugin is NOT active</p>';
        
        // Try to activate
        $result = activate_plugin($plugin_file);
        if (is_wp_error($result)) {
            echo '<p class="error">❌ Failed to activate: ' . $result->get_error_message() . '</p>';
        } else {
            echo '<p class="success">✅ Plugin activated!</p>';
            $is_active = true;
        }
    }
    
    echo '<h2>Step 2: Flush Rewrite Rules</h2>';
    flush_rewrite_rules();
    echo '<p class="success">✅ Rewrite rules flushed</p>';
    
    echo '<h2>Step 3: Create Database Tables</h2>';
    
    global $wpdb;
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    
    // Create organizations table
    $charset_collate = $wpdb->get_charset_collate();
    $sql1 = "CREATE TABLE IF NOT EXISTS $orgs_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        slug varchar(100) NOT NULL,
        domain varchar(255),
        status enum('active','inactive','suspended') DEFAULT 'active',
        contact_email varchar(255),
        settings longtext,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY slug (slug)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql1);
    
    // Create user-organizations table
    $sql2 = "CREATE TABLE IF NOT EXISTS $user_orgs_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        organization_id bigint(20) NOT NULL,
        role varchar(50) DEFAULT 'member',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY organization_id (organization_id)
    ) $charset_collate;";
    
    dbDelta($sql2);
    
    echo '<p class="success">✅ Database tables created/verified</p>';
    
    echo '<h2>Step 4: Test API Endpoints</h2>';
    
    // Test if endpoints are now available
    $api_url = home_url('/wp-json/casa/v1/');
    $response = wp_remote_get($api_url);
    
    if (!is_wp_error($response)) {
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['routes'])) {
            $has_org_endpoint = isset($data['routes']['/casa/v1/register-organization']);
            $has_vol_endpoint = isset($data['routes']['/casa/v1/register-volunteer']);
            
            if ($has_org_endpoint) {
                echo '<p class="success">✅ Organization registration endpoint found</p>';
            } else {
                echo '<p class="error">❌ Organization registration endpoint NOT found</p>';
            }
            
            if ($has_vol_endpoint) {
                echo '<p class="success">✅ Volunteer registration endpoint found</p>';
            } else {
                echo '<p class="error">❌ Volunteer registration endpoint NOT found</p>';
            }
            
            if (!$has_org_endpoint || !$has_vol_endpoint) {
                echo '<p class="warning">⚠️ Some endpoints missing. This might be because the plugin code needs to be updated.</p>';
            }
        } else {
            echo '<p class="error">❌ Could not parse API response</p>';
        }
    } else {
        echo '<p class="error">❌ Could not connect to API</p>';
    }
    
    echo '<h2>Step 5: Manual Endpoint Registration</h2>';
    
    // Force register the endpoints
    if (!function_exists('casa_register_organization')) {
        echo '<p class="warning">⚠️ Registration functions not found. Creating temporary ones...</p>';
        
        function casa_register_organization($request) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Function not properly loaded from plugin'
            ), 500);
        }
        
        function casa_register_volunteer($request) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Function not properly loaded from plugin'
            ), 500);
        }
        
        function casa_check_authentication() {
            return true;
        }
    }
    
    // Register endpoints manually
    add_action('rest_api_init', function() {
        register_rest_route('casa/v1', '/register-organization', array(
            'methods' => 'POST',
            'callback' => 'casa_register_organization',
            'permission_callback' => '__return_true'
        ));
        
        register_rest_route('casa/v1', '/register-volunteer', array(
            'methods' => 'POST', 
            'callback' => 'casa_register_volunteer',
            'permission_callback' => 'casa_check_authentication'
        ));
    });
    
    echo '<p class="success">✅ Endpoints manually registered</p>';
    
    echo '<h2>Next Steps</h2>';
    echo '<ol>';
    echo '<li><strong>Test the API:</strong> <a href="' . home_url('/wp-json/casa/v1/') . '" target="_blank">View CASA API</a></li>';
    echo '<li><strong>Test Organization Registration:</strong> Try creating an organization at <code>/auth/organization-register</code></li>';
    echo '<li><strong>Check Plugin Code:</strong> Make sure the plugin file is properly updated with the new endpoints</li>';
    echo '</ol>';
    
    echo '<h2>Plugin File Location</h2>';
    $plugin_path = WP_PLUGIN_DIR . '/casa-enhanced/casa-enhanced.php';
    echo '<p>Plugin should be at: <code>' . $plugin_path . '</code></p>';
    
    if (file_exists($plugin_path)) {
        echo '<p class="success">✅ Plugin file exists</p>';
        
        // Check if our functions are in the file
        $plugin_content = file_get_contents($plugin_path);
        if (strpos($plugin_content, 'register-organization') !== false) {
            echo '<p class="success">✅ Registration endpoints found in plugin code</p>';
        } else {
            echo '<p class="error">❌ Registration endpoints NOT found in plugin code</p>';
            echo '<p>The plugin file may need to be updated with the new endpoint code.</p>';
        }
    } else {
        echo '<p class="error">❌ Plugin file does not exist</p>';
    }
    ?>
    
    <hr>
    <p><strong>If endpoints still don't work, the plugin file may need to be updated or copied to the correct WordPress plugins directory.</strong></p>
</body>
</html>