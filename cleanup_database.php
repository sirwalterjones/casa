<?php
/**
 * CASA Database Cleanup Script
 * Run this through WordPress admin or directly
 */

// If running directly, include WordPress
if (!defined('ABSPATH')) {
    require_once('../../../wp-config.php');
}

global $wpdb;

echo "<h2>CASA Database Cleanup</h2>";
echo "<p>Cleaning up database to keep only Bartow organization and specified users...</p>";

// First, let's see what organizations exist
echo "<h3>Current Organizations:</h3>";
$orgs = $wpdb->get_results("SELECT id, name, slug, status FROM {$wpdb->prefix}casa_organizations");
foreach ($orgs as $org) {
    echo "ID: {$org->id}, Name: {$org->name}, Slug: {$org->slug}, Status: {$org->status}<br>";
}

// Find the Bartow organization ID
echo "<h3>Bartow Organization:</h3>";
$bartow = $wpdb->get_row("SELECT id, name, slug FROM {$wpdb->prefix}casa_organizations WHERE slug = 'bartow'");
if ($bartow) {
    echo "ID: {$bartow->id}, Name: {$bartow->name}, Slug: {$bartow->slug}<br>";
} else {
    echo "Bartow organization not found!<br>";
    return;
}

// Find the specified users
echo "<h3>Target Users:</h3>";
$users = $wpdb->get_results("SELECT ID, user_email, display_name FROM {$wpdb->users} WHERE user_email IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')");
foreach ($users as $user) {
    echo "ID: {$user->ID}, Email: {$user->user_email}, Name: {$user->display_name}<br>";
}

// Clean up casa_organizations - keep only Bartow
echo "<h3>Cleaning up organizations...</h3>";
$result = $wpdb->query("DELETE FROM {$wpdb->prefix}casa_organizations WHERE slug != 'bartow'");
echo "Deleted " . $result . " non-Bartow organizations<br>";

// Clean up casa_user_organizations - keep only Bartow associations
echo "<h3>Cleaning up user organizations...</h3>";
$result = $wpdb->query("
    DELETE uo FROM {$wpdb->prefix}casa_user_organizations uo
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON uo.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow user organization associations<br>";

// Clean up casa_volunteers - keep only Bartow volunteers
echo "<h3>Cleaning up volunteers...</h3>";
$result = $wpdb->query("
    DELETE v FROM {$wpdb->prefix}casa_volunteers v
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON v.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow volunteers<br>";

// Clean up casa_cases - keep only Bartow cases
echo "<h3>Cleaning up cases...</h3>";
$result = $wpdb->query("
    DELETE c FROM {$wpdb->prefix}casa_cases c
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow cases<br>";

// Clean up casa_contact_logs - keep only Bartow contact logs
echo "<h3>Cleaning up contact logs...</h3>";
$result = $wpdb->query("
    DELETE cl FROM {$wpdb->prefix}casa_contact_logs cl
    LEFT JOIN {$wpdb->prefix}casa_cases c ON cl.case_id = c.id
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow contact logs<br>";

// Clean up casa_court_hearings - keep only Bartow court hearings
echo "<h3>Cleaning up court hearings...</h3>";
$result = $wpdb->query("
    DELETE ch FROM {$wpdb->prefix}casa_court_hearings ch
    LEFT JOIN {$wpdb->prefix}casa_cases c ON ch.case_id = c.id
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow court hearings<br>";

// Clean up casa_documents - keep only Bartow documents
echo "<h3>Cleaning up documents...</h3>";
$result = $wpdb->query("
    DELETE d FROM {$wpdb->prefix}casa_documents d
    LEFT JOIN {$wpdb->prefix}casa_cases c ON d.case_id = c.id
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow documents<br>";

// Clean up casa_reports - keep only Bartow reports
echo "<h3>Cleaning up reports...</h3>";
$result = $wpdb->query("
    DELETE r FROM {$wpdb->prefix}casa_reports r
    LEFT JOIN {$wpdb->prefix}casa_cases c ON r.case_id = c.id
    LEFT JOIN {$wpdb->prefix}casa_organizations o ON c.organization_id = o.id
    WHERE o.slug != 'bartow' OR o.id IS NULL
");
echo "Deleted " . $result . " non-Bartow reports<br>";

// Clean up WordPress users - keep only specified users
echo "<h3>Cleaning up WordPress users...</h3>";
$result = $wpdb->query("DELETE FROM {$wpdb->users} WHERE user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')");
echo "Deleted " . $result . " non-target users<br>";

// Clean up user meta - keep only for specified users
echo "<h3>Cleaning up user meta...</h3>";
$result = $wpdb->query("
    DELETE um FROM {$wpdb->usermeta} um
    LEFT JOIN {$wpdb->users} u ON um.user_id = u.ID
    WHERE u.user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')
");
echo "Deleted " . $result . " non-target user meta records<br>";

// Clean up casa_profiles - keep only for specified users
echo "<h3>Cleaning up casa profiles...</h3>";
$result = $wpdb->query("
    DELETE cp FROM {$wpdb->prefix}casa_profiles cp
    LEFT JOIN {$wpdb->users} u ON cp.user_id = u.ID
    WHERE u.user_email NOT IN ('walterjonesjr@gmail.com', 'walter@narcrms.net')
");
echo "Deleted " . $result . " non-target casa profiles<br>";

// Show final state
echo "<h3>Final Organizations:</h3>";
$orgs = $wpdb->get_results("SELECT id, name, slug, status FROM {$wpdb->prefix}casa_organizations");
foreach ($orgs as $org) {
    echo "ID: {$org->id}, Name: {$org->name}, Slug: {$org->slug}, Status: {$org->status}<br>";
}

echo "<h3>Final Users:</h3>";
$users = $wpdb->get_results("SELECT ID, user_email, display_name FROM {$wpdb->users}");
foreach ($users as $user) {
    echo "ID: {$user->ID}, Email: {$user->user_email}, Name: {$user->display_name}<br>";
}

echo "<h3>Final User Organizations:</h3>";
$user_orgs = $wpdb->get_results("
    SELECT uo.*, u.user_email, o.name as org_name 
    FROM {$wpdb->prefix}casa_user_organizations uo
    JOIN {$wpdb->users} u ON uo.user_id = u.ID
    JOIN {$wpdb->prefix}casa_organizations o ON uo.organization_id = o.id
");
foreach ($user_orgs as $uo) {
    echo "User: {$uo->user_email}, Organization: {$uo->org_name}, Role: {$uo->casa_role}<br>";
}

echo "<h2>Cleanup Complete!</h2>";
echo "<p>The database has been cleaned up to keep only Bartow organization data and the specified users.</p>";
?> 