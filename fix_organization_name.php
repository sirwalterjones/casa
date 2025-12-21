<?php
/**
 * Fix Organization Name
 */

// If running directly, include WordPress
if (!defined('ABSPATH')) {
    require_once('../../../wp-config.php');
}

global $wpdb;

echo "<h2>Fixing Organization Name</h2>";

// Update Bartow organization name
$result = $wpdb->update(
    $wpdb->prefix . 'casa_organizations',
    array('name' => 'Bartow CASA Program'),
    array('slug' => 'bartow'),
    array('%s'),
    array('%s')
);

if ($result !== false) {
    echo "Successfully updated Bartow organization name to 'Bartow CASA Program'<br>";
} else {
    echo "Failed to update organization name<br>";
}

// Show current organizations
echo "<h3>Current Organizations:</h3>";
$orgs = $wpdb->get_results("SELECT id, name, slug, status FROM {$wpdb->prefix}casa_organizations");
foreach ($orgs as $org) {
    echo "ID: {$org->id}, Name: {$org->name}, Slug: {$org->slug}, Status: {$org->status}<br>";
}

echo "<h2>Organization name fix complete!</h2>";
?> 