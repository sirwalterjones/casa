<?php
/**
 * Fix User Organization Assignment
 */

// If running directly, include WordPress
if (!defined('ABSPATH')) {
    require_once('../../../wp-config.php');
}

global $wpdb;

echo "<h2>Fixing User Organization Assignment</h2>";

// Get user ID for walter@narcrms.net
$user_id = $wpdb->get_var($wpdb->prepare("SELECT ID FROM {$wpdb->users} WHERE user_email = %s", 'walter@narcrms.net'));
echo "User ID for walter@narcrms.net: {$user_id}<br>";

// Get Bartow organization ID
$org_id = $wpdb->get_var($wpdb->prepare("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE slug = %s", 'bartow'));
echo "Bartow organization ID: {$org_id}<br>";

if ($user_id && $org_id) {
    // Check if user is already assigned
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}casa_user_organizations WHERE user_id = %d AND organization_id = %d",
        $user_id, $org_id
    ));
    
    if ($existing) {
        echo "User is already assigned to Bartow organization<br>";
    } else {
        // Assign user to Bartow organization
        $result = $wpdb->insert($wpdb->prefix . 'casa_user_organizations', array(
            'user_id' => $user_id,
            'organization_id' => $org_id,
            'casa_role' => 'administrator',
            'status' => 'active',
            'background_check_status' => 'approved',
            'training_status' => 'completed',
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ));
        
        if ($result) {
            echo "Successfully assigned user to Bartow organization<br>";
        } else {
            echo "Failed to assign user to organization<br>";
        }
    }
} else {
    echo "Could not find user or organization<br>";
}

// Show current user organizations
echo "<h3>Current User Organizations:</h3>";
$user_orgs = $wpdb->get_results("
    SELECT uo.*, u.user_email, o.name as org_name 
    FROM {$wpdb->prefix}casa_user_organizations uo
    JOIN {$wpdb->users} u ON uo.user_id = u.ID
    JOIN {$wpdb->prefix}casa_organizations o ON uo.organization_id = o.id
");
foreach ($user_orgs as $uo) {
    echo "User: {$uo->user_email}, Organization: {$uo->org_name}, Role: {$uo->casa_role}<br>";
}

echo "<h2>User assignment fix complete!</h2>";
?> 