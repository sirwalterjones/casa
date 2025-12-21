<?php
/**
 * Force Database Cleanup - More Aggressive
 */

// If running directly, include WordPress
if (!defined('ABSPATH')) {
    require_once('../../../wp-config.php');
}

global $wpdb;

echo "<h2>Force Database Cleanup</h2>";

// First, let's see what we have
echo "<h3>Before Cleanup:</h3>";
$orgs = $wpdb->get_results("SELECT id, name, slug, status FROM {$wpdb->prefix}casa_organizations");
foreach ($orgs as $org) {
    echo "ID: {$org->id}, Name: {$org->name}, Slug: {$org->slug}, Status: {$org->status}<br>";
}

// DELETE ALL organizations except Bartow
echo "<h3>Deleting all organizations except Bartow...</h3>";
$result = $wpdb->query("DELETE FROM {$wpdb->prefix}casa_organizations WHERE slug != 'bartow'");
echo "Deleted " . $result . " organizations<br>";

// If Bartow doesn't exist, create it
$bartow = $wpdb->get_row("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE slug = 'bartow'");
if (!$bartow) {
    echo "<h3>Creating Bartow organization...</h3>";
    $wpdb->insert($wpdb->prefix . 'casa_organizations', array(
        'name' => 'Bartow CASA Program',
        'slug' => 'bartow',
        'domain' => 'casa-backend.local',
        'status' => 'active',
        'contact_email' => 'walterjonesjr@gmail.com',
        'settings' => json_encode(array(
            'allowVolunteerSelfRegistration' => true,
            'requireBackgroundCheck' => true,
            'maxCasesPerVolunteer' => 5
        )),
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ));
    echo "Created Bartow organization<br>";
}

// Get Bartow ID
$bartow_id = $wpdb->get_var("SELECT id FROM {$wpdb->prefix}casa_organizations WHERE slug = 'bartow'");
echo "Bartow ID: {$bartow_id}<br>";

// Clean up ALL user organizations
echo "<h3>Cleaning up user organizations...</h3>";
$result = $wpdb->query("DELETE FROM {$wpdb->prefix}casa_user_organizations");
echo "Deleted " . $result . " user organization records<br>";

// Get walterjonesjr@gmail.com user ID
$user_id = $wpdb->get_var($wpdb->prepare("SELECT ID FROM {$wpdb->users} WHERE user_email = %s", 'walterjonesjr@gmail.com'));
echo "User ID for walterjonesjr@gmail.com: {$user_id}<br>";

// Create proper user-organization association
if ($user_id && $bartow_id) {
    echo "<h3>Creating user-organization association...</h3>";
    $wpdb->insert($wpdb->prefix . 'casa_user_organizations', array(
        'user_id' => $user_id,
        'organization_id' => $bartow_id,
        'casa_role' => 'administrator',
        'status' => 'active',
        'background_check_status' => 'approved',
        'training_status' => 'completed',
        'created_at' => current_time('mysql'),
        'updated_at' => current_time('mysql')
    ));
    echo "Created user-organization association<br>";
}

// Clean up ALL other CASA data
echo "<h3>Cleaning up all CASA data...</h3>";
$tables = array('casa_volunteers', 'casa_cases', 'casa_contact_logs', 'casa_court_hearings', 'casa_documents', 'casa_reports');
foreach ($tables as $table) {
    $result = $wpdb->query("DELETE FROM {$wpdb->prefix}{$table}");
    echo "Deleted " . $result . " records from {$table}<br>";
}

// Clean up ALL user meta except for specified users
echo "<h3>Cleaning up user meta...</h3>";
$result = $wpdb->query("
    DELETE FROM {$wpdb->usermeta} 
    WHERE user_id NOT IN (
        SELECT ID FROM {$wpdb->users} 
        WHERE user_email IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')
    )
");
echo "Deleted " . $result . " user meta records<br>";

// Clean up casa_profiles
echo "<h3>Cleaning up casa profiles...</h3>";
$result = $wpdb->query("
    DELETE FROM {$wpdb->prefix}casa_profiles 
    WHERE user_id NOT IN (
        SELECT ID FROM {$wpdb->users} 
        WHERE user_email IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')
    )
");
echo "Deleted " . $result . " casa profile records<br>";

// Show final state
echo "<h3>After Cleanup:</h3>";
$orgs = $wpdb->get_results("SELECT id, name, slug, status FROM {$wpdb->prefix}casa_organizations");
foreach ($orgs as $org) {
    echo "ID: {$org->id}, Name: {$org->name}, Slug: {$org->slug}, Status: {$org->status}<br>";
}

$users = $wpdb->get_results("SELECT ID, user_email, display_name FROM {$wpdb->users}");
foreach ($users as $user) {
    echo "User ID: {$user->ID}, Email: {$user->user_email}, Name: {$user->display_name}<br>";
}

$user_orgs = $wpdb->get_results("
    SELECT uo.*, u.user_email, o.name as org_name 
    FROM {$wpdb->prefix}casa_user_organizations uo
    JOIN {$wpdb->users} u ON uo.user_id = u.ID
    JOIN {$wpdb->prefix}casa_organizations o ON uo.organization_id = o.id
");
foreach ($user_orgs as $uo) {
    echo "User: {$uo->user_email}, Organization: {$uo->org_name}, Role: {$uo->casa_role}<br>";
}

echo "<h2>Force Cleanup Complete!</h2>";
echo "<p>The database has been aggressively cleaned up. Only Bartow organization and specified users remain.</p>";
?> 