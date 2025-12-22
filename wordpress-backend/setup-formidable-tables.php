<?php
/**
 * Formidable Forms Table Setup Script for MySQL 8.0
 *
 * This script creates the Formidable Forms database tables manually
 * to avoid the dbDelta() issue with MySQL 8.0.
 *
 * Run via: /wp-admin/admin.php?page=setup-formidable-tables
 * Or via CLI: php setup-formidable-tables.php
 */

// Load WordPress if running via CLI or direct access
if (!defined('ABSPATH')) {
    $wp_load_paths = [
        dirname(__FILE__) . '/wp-load.php',
        dirname(__FILE__) . '/../wp-load.php',
        '/var/www/html/wp-load.php',
    ];

    foreach ($wp_load_paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            break;
        }
    }
}

// Check if we're in admin or CLI context
$is_cli = php_sapi_name() === 'cli';

if (!$is_cli && !current_user_can('manage_options')) {
    wp_die('Unauthorized access');
}

function setup_formidable_tables() {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();
    $prefix = $wpdb->prefix;

    $messages = [];

    // Helper function to safely create table if not exists
    $create_table_if_not_exists = function($table_name, $sql) use ($wpdb, &$messages) {
        $table_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = %s AND table_name = %s",
            DB_NAME,
            $table_name
        ));

        if (!$table_exists) {
            $result = $wpdb->query($sql);
            if ($result !== false) {
                $messages[] = "Created table: $table_name";
            } else {
                $messages[] = "ERROR creating table $table_name: " . $wpdb->last_error;
            }
        } else {
            $messages[] = "Table already exists: $table_name";
        }
    };

    // 1. Create frm_fields table
    $create_table_if_not_exists(
        $prefix . 'frm_fields',
        "CREATE TABLE {$prefix}frm_fields (
            id BIGINT(20) NOT NULL auto_increment,
            field_key varchar(100) default NULL,
            name text default NULL,
            description longtext default NULL,
            type text default NULL,
            default_value longtext default NULL,
            options longtext default NULL,
            field_order int(11) default 0,
            required int(1) default NULL,
            field_options longtext default NULL,
            form_id int(11) default NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            UNIQUE KEY field_key (field_key)
        ) $charset_collate"
    );

    // 2. Create frm_forms table
    $create_table_if_not_exists(
        $prefix . 'frm_forms',
        "CREATE TABLE {$prefix}frm_forms (
            id int(11) NOT NULL auto_increment,
            form_key varchar(100) default NULL,
            name varchar(255) default NULL,
            description text default NULL,
            parent_form_id int(11) default 0,
            logged_in tinyint(1) default NULL,
            editable tinyint(1) default NULL,
            is_template tinyint(1) default 0,
            default_template tinyint(1) default 0,
            status varchar(255) default NULL,
            options longtext default NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY form_key (form_key)
        ) $charset_collate"
    );

    // 3. Create frm_items (entries) table
    $create_table_if_not_exists(
        $prefix . 'frm_items',
        "CREATE TABLE {$prefix}frm_items (
            id BIGINT(20) NOT NULL auto_increment,
            item_key varchar(100) default NULL,
            name varchar(255) default NULL,
            description text default NULL,
            ip text default NULL,
            form_id BIGINT(20) default NULL,
            post_id BIGINT(20) default NULL,
            user_id BIGINT(20) default NULL,
            parent_item_id BIGINT(20) default 0,
            is_draft tinyint(1) default 0,
            updated_by BIGINT(20) default NULL,
            created_at datetime NOT NULL,
            updated_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY item_key (item_key),
            KEY user_id (user_id),
            KEY parent_item_id (parent_item_id),
            KEY post_id (post_id)
        ) $charset_collate"
    );

    // 4. Create frm_item_metas table
    $create_table_if_not_exists(
        $prefix . 'frm_item_metas',
        "CREATE TABLE {$prefix}frm_item_metas (
            id BIGINT(20) NOT NULL auto_increment,
            meta_value longtext default NULL,
            field_id BIGINT(20) NOT NULL,
            item_id BIGINT(20) NOT NULL,
            created_at datetime NOT NULL,
            PRIMARY KEY (id),
            KEY field_id (field_id),
            KEY item_id (item_id)
        ) $charset_collate"
    );

    // 5. Add composite indexes for optimization (if they don't exist)
    $indexes_to_add = [
        ['table' => $prefix . 'frm_items', 'name' => 'idx_form_id_is_draft', 'columns' => 'form_id, is_draft'],
        ['table' => $prefix . 'frm_item_metas', 'name' => 'idx_item_id_field_id', 'columns' => 'item_id, field_id'],
        ['table' => $prefix . 'frm_fields', 'name' => 'idx_form_id_type', 'columns' => 'form_id, type(100)'],
    ];

    foreach ($indexes_to_add as $idx) {
        $index_exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM information_schema.statistics
             WHERE table_schema = %s AND table_name = %s AND index_name = %s",
            DB_NAME,
            $idx['table'],
            $idx['name']
        ));

        if (!$index_exists) {
            $result = $wpdb->query("ALTER TABLE {$idx['table']} ADD INDEX {$idx['name']} ({$idx['columns']})");
            if ($result !== false) {
                $messages[] = "Added index {$idx['name']} on {$idx['table']}";
            }
        }
    }

    // Update Formidable version option to mark installation as complete
    update_option('frm_db_version', 109);
    $messages[] = "Set frm_db_version option to 109";

    return $messages;
}

// Run the setup
$results = setup_formidable_tables();

// Output results
if (php_sapi_name() === 'cli') {
    foreach ($results as $msg) {
        echo $msg . "\n";
    }
    echo "\nFormidable Forms tables setup complete.\n";
} else {
    echo '<html><head><title>Formidable Forms Table Setup</title></head><body>';
    echo '<h1>Formidable Forms Table Setup</h1>';
    echo '<ul>';
    foreach ($results as $msg) {
        $color = strpos($msg, 'ERROR') !== false ? 'red' : (strpos($msg, 'Created') !== false ? 'green' : 'gray');
        echo "<li style='color: $color;'>$msg</li>";
    }
    echo '</ul>';
    echo '<p><a href="/wp-admin/admin.php?page=formidable">Go to Formidable Forms</a></p>';
    echo '</body></html>';
}
