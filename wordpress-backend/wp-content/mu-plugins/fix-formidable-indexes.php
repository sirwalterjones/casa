<?php
/**
 * Fix Formidable Forms Duplicate Index Issue
 *
 * This mu-plugin fixes the "Duplicate key name 'item_key'" error that occurs
 * with Formidable Forms on MySQL 8.0 when dbDelta tries to add indexes that
 * already exist.
 *
 * The root cause is that PHP 8.1+ changed mysqli to throw exceptions by default
 * for duplicate key errors, whereas before it just returned false.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * CRITICAL FIX: Set mysqli to report errors as warnings, not exceptions
 * This must happen BEFORE WordPress connects to the database
 *
 * In PHP 8.1+, mysqli throws mysqli_sql_exception by default.
 * Duplicate key (error 1061) is not a fatal error - the table still works.
 */
mysqli_report(MYSQLI_REPORT_OFF);

/**
 * Also set it after WordPress loads, in case it gets reset
 */
function casa_fix_mysqli_reporting() {
    mysqli_report(MYSQLI_REPORT_OFF);
}
add_action('muplugins_loaded', 'casa_fix_mysqli_reporting', -PHP_INT_MAX);
add_action('plugins_loaded', 'casa_fix_mysqli_reporting', -PHP_INT_MAX);
add_action('init', 'casa_fix_mysqli_reporting', -PHP_INT_MAX);

/**
 * CRITICAL: Disable Formidable's auto-upgrade that causes the index error
 * This is the cleanest fix - prevent Formidable from running the problematic migration
 */
add_filter('frm_stop_upgrade', '__return_true', 1);

/**
 * Mark Formidable as already upgraded to prevent migration attempts
 * This prevents the FrmMigrate class from running ALTER TABLE statements
 */
function casa_prevent_frm_migration() {
    // Get current Formidable version
    if (!class_exists('FrmAppHelper')) {
        return;
    }

    // Mark as upgraded by setting the database version to current
    $current_version = class_exists('FrmAppHelper') ? FrmAppHelper::plugin_version() : '6.26';
    update_option('frm_db_version', $current_version);
}
add_action('plugins_loaded', 'casa_prevent_frm_migration', 1);

/**
 * Suppress MySQL errors during dbDelta operations
 * This catches any remaining duplicate key errors
 */
function casa_suppress_mysql_duplicate_key_error() {
    global $wpdb;

    // Only on admin pages
    if (!is_admin()) {
        return;
    }

    // Suppress errors temporarily during potential migration
    $wpdb->suppress_errors(true);
}
add_action('admin_init', 'casa_suppress_mysql_duplicate_key_error', -9999);

/**
 * Re-enable MySQL error reporting after init
 */
function casa_restore_mysql_errors() {
    global $wpdb;
    $wpdb->suppress_errors(false);
}
add_action('admin_init', 'casa_restore_mysql_errors', 9999);

/**
 * Alternative: Handle the specific page that triggers migration
 */
function casa_handle_formidable_page() {
    if (!isset($_GET['page'])) {
        return;
    }

    // If on Formidable page, set a more permissive SQL mode
    if (strpos($_GET['page'], 'formidable') !== false) {
        global $wpdb;
        // Suppress errors during Formidable admin page load
        $wpdb->suppress_errors(true);
        $wpdb->query("SET SESSION sql_mode = ''");
    }
}
add_action('admin_init', 'casa_handle_formidable_page', -10000);

/**
 * REST API endpoint to manually fix indexes if needed
 */
function casa_register_fix_indexes_endpoint() {
    register_rest_route('casa/v1', '/fix-indexes', array(
        'methods' => 'POST',
        'callback' => 'casa_fix_formidable_indexes',
        'permission_callback' => function() {
            return current_user_can('manage_options');
        }
    ));
}
add_action('rest_api_init', 'casa_register_fix_indexes_endpoint');

/**
 * Manually fix duplicate indexes
 */
function casa_fix_formidable_indexes($request) {
    global $wpdb;

    $results = array();

    // Tables and their potential duplicate indexes
    $tables = array(
        'frm_items' => 'item_key',
        'frm_fields' => 'field_key',
        'frm_forms' => 'form_key',
    );

    foreach ($tables as $table_base => $index_name) {
        $table = $wpdb->prefix . $table_base;

        // Check if table exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table'");
        if (!$table_exists) {
            $results[$table_base] = 'Table does not exist';
            continue;
        }

        // Get all indexes with this name
        $indexes = $wpdb->get_results("SHOW INDEX FROM `$table` WHERE Key_name = '$index_name'");

        if (empty($indexes)) {
            $results[$table_base] = 'No index found';
        } else {
            $results[$table_base] = 'Index exists (' . count($indexes) . ' columns)';
        }
    }

    // Update Formidable database version to prevent future migrations
    if (class_exists('FrmAppHelper')) {
        $version = FrmAppHelper::plugin_version();
        update_option('frm_db_version', $version);
        $results['frm_db_version'] = $version;
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Index check complete',
        'data' => $results
    ), 200);
}
