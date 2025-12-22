<?php
/**
 * Standalone Formidable Forms Fix Script
 *
 * This script fixes the duplicate index issue by updating the frm_db_version
 * option directly, bypassing WordPress's normal loading process.
 *
 * Access this file directly at: /fix-formidable.php?key=casa_fix_2024
 */

// Security key - must match to execute
$security_key = 'casa_fix_2024';

if (!isset($_GET['key']) || $_GET['key'] !== $security_key) {
    http_response_code(403);
    die(json_encode(['error' => 'Invalid security key']));
}

// Database configuration (matches wp-config.php)
$db_host = getenv('WORDPRESS_DB_HOST') ?: 'localhost';
$db_name = getenv('WORDPRESS_DB_NAME') ?: 'wordpress';
$db_user = getenv('WORDPRESS_DB_USER') ?: 'root';
$db_pass = getenv('WORDPRESS_DB_PASSWORD') ?: '';
$table_prefix = getenv('WORDPRESS_TABLE_PREFIX') ?: 'wp_';

header('Content-Type: application/json');

try {
    // Connect to database
    $mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);

    if ($mysqli->connect_error) {
        throw new Exception('Database connection failed: ' . $mysqli->connect_error);
    }

    $results = [];

    // 1. Update frm_db_version to prevent migration
    $current_version = '6.26.2';
    $options_table = $table_prefix . 'options';

    // Check current version
    $stmt = $mysqli->prepare("SELECT option_value FROM $options_table WHERE option_name = 'frm_db_version'");
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $old_version = $row ? $row['option_value'] : 'NOT SET';
    $stmt->close();

    // Update or insert the version
    $stmt = $mysqli->prepare("INSERT INTO $options_table (option_name, option_value, autoload)
                              VALUES ('frm_db_version', ?, 'yes')
                              ON DUPLICATE KEY UPDATE option_value = ?");
    $stmt->bind_param('ss', $current_version, $current_version);
    $stmt->execute();
    $stmt->close();

    $results['frm_db_version'] = [
        'old' => $old_version,
        'new' => $current_version,
        'status' => 'updated'
    ];

    // 2. Check indexes on Formidable tables
    $tables_to_check = [
        'frm_items' => 'item_key',
        'frm_fields' => 'field_key',
        'frm_forms' => 'form_key'
    ];

    foreach ($tables_to_check as $table_base => $index_name) {
        $table = $table_prefix . $table_base;

        // Check if table exists
        $result = $mysqli->query("SHOW TABLES LIKE '$table'");
        if ($result->num_rows === 0) {
            $results['indexes'][$table_base] = 'table not found';
            continue;
        }

        // Check index
        $result = $mysqli->query("SHOW INDEX FROM `$table` WHERE Key_name = '$index_name'");
        $index_count = $result->num_rows;
        $results['indexes'][$table_base] = "index '$index_name' has $index_count column(s)";
    }

    // 3. Try to set permissive SQL mode
    $mysqli->query("SET SESSION sql_mode = ''");
    $results['sql_mode'] = 'set to permissive';

    $mysqli->close();

    echo json_encode([
        'success' => true,
        'message' => 'Formidable fix applied',
        'data' => $results
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
