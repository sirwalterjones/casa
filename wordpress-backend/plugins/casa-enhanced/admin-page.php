<?php
/**
 * CASA Enhanced Admin Page
 * Provides tools to manage the CASA system and flush rewrite rules
 */

// Add admin menu
add_action('admin_menu', 'casa_enhanced_admin_menu');

function casa_enhanced_admin_menu() {
    add_options_page(
        'CASA Enhanced Settings',
        'CASA Enhanced',
        'manage_options',
        'casa-enhanced',
        'casa_enhanced_admin_page'
    );
}

function casa_enhanced_admin_page() {
    // Handle form submissions
    if (isset($_POST['flush_rules'])) {
        flush_rewrite_rules();
        echo '<div class="notice notice-success"><p>Rewrite rules flushed successfully!</p></div>';
    }
    
    if (isset($_POST['test_endpoints'])) {
        $api_url = home_url('/wp-json/casa/v1/');
        $response = wp_remote_get($api_url);
        
        if (!is_wp_error($response)) {
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            $has_register_org = isset($data['routes']['/casa/v1/register-organization']);
            $has_register_vol = isset($data['routes']['/casa/v1/register-volunteer']);
            
            if ($has_register_org && $has_register_vol) {
                echo '<div class="notice notice-success"><p>✅ All registration endpoints are working!</p></div>';
            } else {
                echo '<div class="notice notice-error"><p>❌ Registration endpoints not found. Try flushing rewrite rules.</p></div>';
            }
        } else {
            echo '<div class="notice notice-error"><p>❌ Could not connect to API endpoints.</p></div>';
        }
    }
    
    if (isset($_POST['create_tables'])) {
        casa_create_tables();
        echo '<div class="notice notice-success"><p>Database tables created/updated!</p></div>';
    }
    
    // Get system status
    global $wpdb;
    $orgs_table = $wpdb->prefix . 'casa_organizations';
    $user_orgs_table = $wpdb->prefix . 'casa_user_organizations';
    
    $tables_exist = [
        'casa_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$orgs_table'") == $orgs_table,
        'casa_user_organizations' => $wpdb->get_var("SHOW TABLES LIKE '$user_orgs_table'") == $user_orgs_table
    ];
    
    $org_count = $tables_exist['casa_organizations'] ? $wpdb->get_var("SELECT COUNT(*) FROM $orgs_table") : 0;
    $user_count = $tables_exist['casa_user_organizations'] ? $wpdb->get_var("SELECT COUNT(*) FROM $user_orgs_table") : 0;
    
    ?>
    <div class="wrap">
        <h1>CASA Enhanced Settings</h1>
        
        <div class="card">
            <h2>System Status</h2>
            <table class="form-table">
                <tr>
                    <th>Plugin Version</th>
                    <td>2.0.0</td>
                </tr>
                <tr>
                    <th>Organizations Table</th>
                    <td><?php echo $tables_exist['casa_organizations'] ? '✅ Exists' : '❌ Missing'; ?></td>
                </tr>
                <tr>
                    <th>User Organizations Table</th>
                    <td><?php echo $tables_exist['casa_user_organizations'] ? '✅ Exists' : '❌ Missing'; ?></td>
                </tr>
                <tr>
                    <th>Total Organizations</th>
                    <td><?php echo $org_count; ?></td>
                </tr>
                <tr>
                    <th>Total Organization Users</th>
                    <td><?php echo $user_count; ?></td>
                </tr>
            </table>
        </div>
        
        <div class="card">
            <h2>Actions</h2>
            
            <form method="post" style="margin-bottom: 20px;">
                <input type="hidden" name="flush_rules" value="1">
                <p>
                    <input type="submit" class="button button-secondary" value="Flush Rewrite Rules">
                    <span class="description">Use this if API endpoints are not working</span>
                </p>
            </form>
            
            <form method="post" style="margin-bottom: 20px;">
                <input type="hidden" name="test_endpoints" value="1">
                <p>
                    <input type="submit" class="button button-secondary" value="Test API Endpoints">
                    <span class="description">Check if registration endpoints are available</span>
                </p>
            </form>
            
            <form method="post" style="margin-bottom: 20px;">
                <input type="hidden" name="create_tables" value="1">
                <p>
                    <input type="submit" class="button button-secondary" value="Create/Update Database Tables">
                    <span class="description">Ensure all required tables exist</span>
                </p>
            </form>
        </div>
        
        <div class="card">
            <h2>API Endpoints</h2>
            <p>These endpoints should be available:</p>
            <ul>
                <li><code>POST <?php echo home_url('/wp-json/casa/v1/register-organization'); ?></code> - Register new organization</li>
                <li><code>POST <?php echo home_url('/wp-json/casa/v1/register-volunteer'); ?></code> - Register volunteer</li>
                <li><code>GET <?php echo home_url('/wp-json/casa/v1/system-status'); ?></code> - System status</li>
            </ul>
        </div>
        
        <div class="card">
            <h2>Registration URLs</h2>
            <p>Your frontend registration pages:</p>
            <ul>
                <li><strong>Organization Registration:</strong> <code>/auth/organization-register</code></li>
                <li><strong>User Login:</strong> <code>/auth/login</code></li>
                <li><strong>Volunteer Creation:</strong> <code>/volunteers/add</code> (for org admins)</li>
            </ul>
        </div>
    </div>
    <?php
}
?>