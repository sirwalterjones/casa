<?php
/**
 * Update Cases API for Volunteer Access
 */

// WordPress configuration
define('WP_USE_THEMES', false);
require_once('/Users/walterjones/Local Sites/casa-backend/app/public/wp-config.php');

echo "<h2>Update Cases API for Volunteer Access</h2>";

// Check if the plugin file exists
$plugin_file = WP_PLUGIN_DIR . '/casa-enhanced/casa-enhanced.php';
if (!file_exists($plugin_file)) {
    echo "Plugin file not found: {$plugin_file}<br>";
    exit;
}

// Read the plugin file
$plugin_content = file_get_contents($plugin_file);
if (!$plugin_content) {
    echo "Failed to read plugin file.<br>";
    exit;
}

// Create a backup of the plugin file
$backup_file = WP_PLUGIN_DIR . '/casa-enhanced/casa-enhanced.php.bak2';
if (!file_put_contents($backup_file, $plugin_content)) {
    echo "Failed to create backup file.<br>";
    exit;
}
echo "Created backup file: {$backup_file}<br>";

// Define the new function code with volunteer filtering
$new_function_code = <<<'EOT'
function casa_get_cases($request) {
    if (!casa_check_authentication()) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Authentication required'
        ), 401);
    }
    
    $current_user = wp_get_current_user();
    
    global $wpdb;
    $cases_table = $wpdb->prefix . 'casa_cases';
    $users_table = $wpdb->prefix . 'casa_user_organizations';
    
    // Get user's organization and role
    $user_org_data = $wpdb->get_row($wpdb->prepare(
        "SELECT organization_id, casa_role FROM $users_table WHERE user_id = %d AND status = 'active' LIMIT 1",
        $current_user->ID
    ));
    
    if (!$user_org_data) {
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array(
                'cases' => array(),
                'pagination' => array(
                    'total' => 0,
                    'page' => 1,
                    'pages' => 1
                )
            )
        ), 200);
    }
    
    $user_org = $user_org_data->organization_id;
    $user_role = $user_org_data->casa_role;
    
    // If organization_id is provided in the request, use that instead (for admins)
    $org_id = $request->get_param('organization_id');
    if ($org_id && ($user_role === 'administrator' || $user_role === 'supervisor')) {
        $user_org = $org_id;
    }
    
    // Debug log
    error_log("casa_get_cases: user_id={$current_user->ID}, org_id={$user_org}, role={$user_role}");
    
    $where_clause = "WHERE organization_id = %d";
    $params = array($user_org);
    
    // Filter based on user role
    if ($user_role === 'volunteer') {
        // Volunteers can only see cases assigned to them
        $where_clause .= " AND assigned_volunteer_id = %d";
        $params[] = $current_user->ID;
    }
    // Administrators and supervisors can see all cases in their organization (no additional filter)
    
    // Add other filters if provided
    $status = $request->get_param('status');
    if ($status) {
        $where_clause .= " AND status = %s";
        $params[] = $status;
    }
    
    $volunteer_id = $request->get_param('volunteer_id');
    if ($volunteer_id && ($user_role === 'administrator' || $user_role === 'supervisor')) {
        $where_clause .= " AND assigned_volunteer_id = %d";
        $params[] = $volunteer_id;
    }
    
    // Get cases from database table
    $query = "SELECT * FROM $cases_table $where_clause ORDER BY updated_at DESC";
    $cases = $wpdb->get_results($wpdb->prepare($query, ...$params), ARRAY_A);
    
    // If no cases found in database, try to get from WordPress posts as fallback
    if (empty($cases)) {
        $args = array(
            'post_type' => 'casa_case',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => 'organization_id',
                    'value' => $user_org,
                    'compare' => '='
                )
            )
        );
        
        // Add volunteer filter for WordPress posts if user is a volunteer
        if ($user_role === 'volunteer') {
            $args['meta_query'][] = array(
                'key' => 'assigned_volunteer_id',
                'value' => $current_user->ID,
                'compare' => '='
            );
        }
        
        $case_posts = get_posts($args);
        $cases = array();
        
        foreach ($case_posts as $post) {
            $case_number = get_post_meta($post->ID, 'case_number', true);
            $child_first_name = get_post_meta($post->ID, 'child_first_name', true);
            $child_last_name = get_post_meta($post->ID, 'child_last_name', true);
            $case_type = get_post_meta($post->ID, 'case_type', true);
            $case_status = get_post_meta($post->ID, 'case_status', true) ?: 'active';
            $assigned_volunteer = get_post_meta($post->ID, 'assigned_volunteer', true);
            $assigned_volunteer_id = get_post_meta($post->ID, 'assigned_volunteer_id', true);
            $assignment_date = get_post_meta($post->ID, 'assignment_date', true);
            
            $cases[] = array(
                'id' => $post->ID,
                'case_number' => $case_number,
                'organization_id' => $user_org,
                'assigned_volunteer_id' => $assigned_volunteer_id,
                'child_first_name' => $child_first_name,
                'child_last_name' => $child_last_name,
                'case_type' => $case_type,
                'case_status' => $case_status,
                'assigned_volunteer' => $assigned_volunteer,
                'assignment_date' => $assignment_date,
                'created_at' => $post->post_date,
                'updated_at' => $post->post_modified
            );
        }
        
        // If we found cases from posts, insert them into the database table for future use
        if (!empty($cases)) {
            foreach ($cases as $case) {
                $wpdb->insert($cases_table, $case);
            }
        }
    }
    
    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'cases' => $cases,
            'pagination' => array(
                'total' => count($cases),
                'page' => 1,
                'pages' => 1
            )
        )
    ), 200);
}
EOT;

// Find the existing function in the plugin file
$pattern = '/function\s+casa_get_cases\s*\([^\)]*\)\s*\{.*?\}/s';
if (!preg_match($pattern, $plugin_content, $matches, PREG_OFFSET_CAPTURE)) {
    echo "Failed to find the casa_get_cases function in the plugin file.<br>";
    exit;
}

$old_function = $matches[0][0];
$old_function_pos = $matches[0][1];

// Find the next function after casa_get_cases
$next_function_pos = strpos($plugin_content, 'function ', $old_function_pos + strlen($old_function));
if ($next_function_pos === false) {
    echo "Failed to find the next function after casa_get_cases.<br>";
    exit;
}

// Extract the entire function including any comments or whitespace before the next function
$actual_function_end = $next_function_pos;
$actual_old_function = substr($plugin_content, $old_function_pos, $actual_function_end - $old_function_pos);

// Replace the function in the plugin file
$new_plugin_content = substr($plugin_content, 0, $old_function_pos) . 
                      $new_function_code . 
                      substr($plugin_content, $actual_function_end);

// Write the modified plugin file
if (!file_put_contents($plugin_file, $new_plugin_content)) {
    echo "Failed to write modified plugin file.<br>";
    exit;
}

echo "Successfully updated cases API with volunteer filtering.<br>";

// Update the plugin version to ensure the changes take effect
$version_pattern = '/Version:\s*(\d+\.\d+\.\d+)/';
if (preg_match($version_pattern, $new_plugin_content, $version_matches)) {
    $current_version = $version_matches[1];
    $version_parts = explode('.', $current_version);
    $version_parts[2]++;
    $new_version = implode('.', $version_parts);
    
    $new_plugin_content = preg_replace(
        $version_pattern, 
        'Version: ' . $new_version, 
        $new_plugin_content
    );
    
    if (!file_put_contents($plugin_file, $new_plugin_content)) {
        echo "Failed to update plugin version.<br>";
    } else {
        echo "Updated plugin version from {$current_version} to {$new_version}.<br>";
    }
}

echo "<h3>Update Applied Successfully!</h3>";
echo "The casa_get_cases function now properly filters cases based on user role:<br>";
echo "- Volunteers: Only see cases assigned to them<br>";
echo "- Administrators/Supervisors: See all cases in their organization<br>";
?>