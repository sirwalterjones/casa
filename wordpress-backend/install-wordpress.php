<?php
/**
 * WordPress Installation Script for Cloud Run
 *
 * Creates WordPress tables and admin user directly via SQL.
 * Run this once after deployment to set up the database.
 */

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
error_reporting(E_ALL);
ini_set('display_errors', 0);

try {
    // Get environment variables
    $db_socket = getenv('WORDPRESS_DB_HOST') ?: '';
    $db_name = getenv('WORDPRESS_DB_NAME') ?: 'wordpress';
    $db_user = getenv('WORDPRESS_DB_USER') ?: 'wordpress';
    $db_pass = getenv('WORDPRESS_DB_PASSWORD') ?: '';
    $table_prefix = 'wp_';

    if (strpos($db_socket, '/cloudsql/') !== 0) {
        throw new Exception('This script is designed for Cloud SQL socket connections');
    }

    // Connect to database
    $mysqli = mysqli_init();
    mysqli_options($mysqli, MYSQLI_OPT_CONNECT_TIMEOUT, 10);

    if (!@mysqli_real_connect($mysqli, null, $db_user, $db_pass, $db_name, null, $db_socket)) {
        throw new Exception('Database connection failed: ' . mysqli_connect_error());
    }

    $mysqli->set_charset('utf8mb4');

    // Check if WordPress is already installed
    $result = $mysqli->query("SHOW TABLES LIKE '{$table_prefix}users'");
    if ($result && $result->num_rows > 0) {
        $result = $mysqli->query("SELECT COUNT(*) as count FROM {$table_prefix}users");
        $row = $result->fetch_assoc();
        if ($row['count'] > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'WordPress is already installed with users',
                'note' => 'Delete all tables to reinstall'
            ]);
            $mysqli->close();
            exit;
        }
    }

    // WordPress 6.x table schema (simplified)
    $tables = [];

    // Users table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}users` (
        `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `user_login` varchar(60) NOT NULL DEFAULT '',
        `user_pass` varchar(255) NOT NULL DEFAULT '',
        `user_nicename` varchar(50) NOT NULL DEFAULT '',
        `user_email` varchar(100) NOT NULL DEFAULT '',
        `user_url` varchar(100) NOT NULL DEFAULT '',
        `user_registered` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `user_activation_key` varchar(255) NOT NULL DEFAULT '',
        `user_status` int(11) NOT NULL DEFAULT 0,
        `display_name` varchar(250) NOT NULL DEFAULT '',
        PRIMARY KEY (`ID`),
        KEY `user_login_key` (`user_login`),
        KEY `user_nicename` (`user_nicename`),
        KEY `user_email` (`user_email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // User meta table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}usermeta` (
        `umeta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `user_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `meta_key` varchar(255) DEFAULT NULL,
        `meta_value` longtext,
        PRIMARY KEY (`umeta_id`),
        KEY `user_id` (`user_id`),
        KEY `meta_key` (`meta_key`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Options table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}options` (
        `option_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `option_name` varchar(191) NOT NULL DEFAULT '',
        `option_value` longtext NOT NULL,
        `autoload` varchar(20) NOT NULL DEFAULT 'yes',
        PRIMARY KEY (`option_id`),
        UNIQUE KEY `option_name` (`option_name`),
        KEY `autoload` (`autoload`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Posts table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}posts` (
        `ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `post_author` bigint(20) unsigned NOT NULL DEFAULT 0,
        `post_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `post_date_gmt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `post_content` longtext NOT NULL,
        `post_title` text NOT NULL,
        `post_excerpt` text NOT NULL,
        `post_status` varchar(20) NOT NULL DEFAULT 'publish',
        `comment_status` varchar(20) NOT NULL DEFAULT 'open',
        `ping_status` varchar(20) NOT NULL DEFAULT 'open',
        `post_password` varchar(255) NOT NULL DEFAULT '',
        `post_name` varchar(200) NOT NULL DEFAULT '',
        `to_ping` text NOT NULL,
        `pinged` text NOT NULL,
        `post_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `post_modified_gmt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `post_content_filtered` longtext NOT NULL,
        `post_parent` bigint(20) unsigned NOT NULL DEFAULT 0,
        `guid` varchar(255) NOT NULL DEFAULT '',
        `menu_order` int(11) NOT NULL DEFAULT 0,
        `post_type` varchar(20) NOT NULL DEFAULT 'post',
        `post_mime_type` varchar(100) NOT NULL DEFAULT '',
        `comment_count` bigint(20) NOT NULL DEFAULT 0,
        PRIMARY KEY (`ID`),
        KEY `post_name` (`post_name`(191)),
        KEY `type_status_date` (`post_type`,`post_status`,`post_date`,`ID`),
        KEY `post_parent` (`post_parent`),
        KEY `post_author` (`post_author`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Post meta table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}postmeta` (
        `meta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `post_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `meta_key` varchar(255) DEFAULT NULL,
        `meta_value` longtext,
        PRIMARY KEY (`meta_id`),
        KEY `post_id` (`post_id`),
        KEY `meta_key` (`meta_key`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Terms table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}terms` (
        `term_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `name` varchar(200) NOT NULL DEFAULT '',
        `slug` varchar(200) NOT NULL DEFAULT '',
        `term_group` bigint(10) NOT NULL DEFAULT 0,
        PRIMARY KEY (`term_id`),
        KEY `slug` (`slug`(191)),
        KEY `name` (`name`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Term taxonomy table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}term_taxonomy` (
        `term_taxonomy_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `term_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `taxonomy` varchar(32) NOT NULL DEFAULT '',
        `description` longtext NOT NULL,
        `parent` bigint(20) unsigned NOT NULL DEFAULT 0,
        `count` bigint(20) NOT NULL DEFAULT 0,
        PRIMARY KEY (`term_taxonomy_id`),
        UNIQUE KEY `term_id_taxonomy` (`term_id`,`taxonomy`),
        KEY `taxonomy` (`taxonomy`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Term relationships table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}term_relationships` (
        `object_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `term_taxonomy_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `term_order` int(11) NOT NULL DEFAULT 0,
        PRIMARY KEY (`object_id`,`term_taxonomy_id`),
        KEY `term_taxonomy_id` (`term_taxonomy_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Term meta table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}termmeta` (
        `meta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `term_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `meta_key` varchar(255) DEFAULT NULL,
        `meta_value` longtext,
        PRIMARY KEY (`meta_id`),
        KEY `term_id` (`term_id`),
        KEY `meta_key` (`meta_key`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Comments table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}comments` (
        `comment_ID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `comment_post_ID` bigint(20) unsigned NOT NULL DEFAULT 0,
        `comment_author` tinytext NOT NULL,
        `comment_author_email` varchar(100) NOT NULL DEFAULT '',
        `comment_author_url` varchar(200) NOT NULL DEFAULT '',
        `comment_author_IP` varchar(100) NOT NULL DEFAULT '',
        `comment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `comment_date_gmt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `comment_content` text NOT NULL,
        `comment_karma` int(11) NOT NULL DEFAULT 0,
        `comment_approved` varchar(20) NOT NULL DEFAULT '1',
        `comment_agent` varchar(255) NOT NULL DEFAULT '',
        `comment_type` varchar(20) NOT NULL DEFAULT 'comment',
        `comment_parent` bigint(20) unsigned NOT NULL DEFAULT 0,
        `user_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        PRIMARY KEY (`comment_ID`),
        KEY `comment_post_ID` (`comment_post_ID`),
        KEY `comment_approved_date_gmt` (`comment_approved`,`comment_date_gmt`),
        KEY `comment_date_gmt` (`comment_date_gmt`),
        KEY `comment_parent` (`comment_parent`),
        KEY `comment_author_email` (`comment_author_email`(10))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Comment meta table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}commentmeta` (
        `meta_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `comment_id` bigint(20) unsigned NOT NULL DEFAULT 0,
        `meta_key` varchar(255) DEFAULT NULL,
        `meta_value` longtext,
        PRIMARY KEY (`meta_id`),
        KEY `comment_id` (`comment_id`),
        KEY `meta_key` (`meta_key`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Links table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}links` (
        `link_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        `link_url` varchar(255) NOT NULL DEFAULT '',
        `link_name` varchar(255) NOT NULL DEFAULT '',
        `link_image` varchar(255) NOT NULL DEFAULT '',
        `link_target` varchar(25) NOT NULL DEFAULT '',
        `link_description` varchar(255) NOT NULL DEFAULT '',
        `link_visible` varchar(20) NOT NULL DEFAULT 'Y',
        `link_owner` bigint(20) unsigned NOT NULL DEFAULT 1,
        `link_rating` int(11) NOT NULL DEFAULT 0,
        `link_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `link_rel` varchar(255) NOT NULL DEFAULT '',
        `link_notes` mediumtext NOT NULL,
        `link_rss` varchar(255) NOT NULL DEFAULT '',
        PRIMARY KEY (`link_id`),
        KEY `link_visible` (`link_visible`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // CASA 2FA codes table
    $tables[] = "CREATE TABLE IF NOT EXISTS `{$table_prefix}casa_2fa_codes` (
        `id` bigint(20) NOT NULL AUTO_INCREMENT,
        `user_id` bigint(20) NOT NULL,
        `code` varchar(6) NOT NULL,
        `temp_token` varchar(64) NOT NULL,
        `expires_at` datetime NOT NULL,
        `used` tinyint(1) DEFAULT 0,
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `user_id` (`user_id`),
        KEY `temp_token` (`temp_token`),
        KEY `expires_at` (`expires_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    // Create tables
    $created = 0;
    foreach ($tables as $sql) {
        if ($mysqli->query($sql)) {
            $created++;
        } else {
            throw new Exception('Failed to create table: ' . $mysqli->error);
        }
    }

    // Generate password hash (WordPress-compatible)
    $admin_password = bin2hex(random_bytes(8)); // 16-char password
    $password_hash = password_hash($admin_password, PASSWORD_BCRYPT, ['cost' => 10]);
    // WordPress uses different format - let's use phpass-compatible
    $password_hash = '$P$B' . substr(str_replace('+', '.', base64_encode(random_bytes(22))), 0, 22);
    // Actually, for simplicity, use a known format
    $admin_password = 'TempPass2024!Casa';
    $password_hash = '$P$B' . hash('md5', $admin_password . 'salt');

    // Better approach: use WordPress's password hashing
    // Since we can't easily replicate it, create a simple known password
    // The user can reset it later via email
    require_once __DIR__ . '/wp-includes/class-phpass.php';
    $hasher = new PasswordHash(8, true);
    $admin_password = 'CasaAdmin2024!Temp';
    $password_hash = $hasher->HashPassword($admin_password);

    $now = date('Y-m-d H:i:s');

    // Insert admin user
    $mysqli->query("INSERT INTO `{$table_prefix}users`
        (user_login, user_pass, user_nicename, user_email, user_url, user_registered, user_activation_key, user_status, display_name)
        VALUES
        ('walter_admin', '{$mysqli->real_escape_string($password_hash)}', 'walter-jones', 'walter@joneswebdesigns.com', '', '{$now}', '', 0, 'Walter Jones')");

    $user_id = $mysqli->insert_id;

    // Add user meta
    $metas = [
        [$user_id, $table_prefix . 'capabilities', 'a:1:{s:13:"administrator";b:1;}'],
        [$user_id, $table_prefix . 'user_level', '10'],
        [$user_id, 'first_name', 'Walter'],
        [$user_id, 'last_name', 'Jones'],
        [$user_id, 'nickname', 'walter_admin'],
        [$user_id, 'casa_role', 'admin'],
        [$user_id, 'casa_status', 'active'],
    ];

    foreach ($metas as $meta) {
        $mysqli->query("INSERT INTO `{$table_prefix}usermeta` (user_id, meta_key, meta_value) VALUES ({$meta[0]}, '{$meta[1]}', '{$mysqli->real_escape_string($meta[2])}')");
    }

    // Insert essential options
    $site_url = 'https://casa-backend-241015914634.us-east4.run.app';
    $options = [
        ['siteurl', $site_url, 'yes'],
        ['home', $site_url, 'yes'],
        ['blogname', 'PA-CASA Case Management', 'yes'],
        ['blogdescription', 'CASA Case Management System', 'yes'],
        ['admin_email', 'walter@joneswebdesigns.com', 'yes'],
        ['users_can_register', '0', 'yes'],
        ['start_of_week', '0', 'yes'],
        ['use_balanceTags', '0', 'yes'],
        ['use_smilies', '0', 'yes'],
        ['require_name_email', '1', 'yes'],
        ['comments_notify', '1', 'yes'],
        ['posts_per_rss', '10', 'yes'],
        ['rss_use_excerpt', '0', 'yes'],
        ['mailserver_url', 'mail.example.com', 'yes'],
        ['mailserver_login', 'login@example.com', 'yes'],
        ['mailserver_pass', 'password', 'yes'],
        ['mailserver_port', '110', 'yes'],
        ['default_category', '1', 'yes'],
        ['default_comment_status', 'open', 'yes'],
        ['default_ping_status', 'open', 'yes'],
        ['default_pingback_flag', '0', 'yes'],
        ['posts_per_page', '10', 'yes'],
        ['date_format', 'F j, Y', 'yes'],
        ['time_format', 'g:i a', 'yes'],
        ['links_updated_date_format', 'F j, Y g:i a', 'yes'],
        ['comment_moderation', '0', 'yes'],
        ['moderation_notify', '1', 'yes'],
        ['permalink_structure', '/%postname%/', 'yes'],
        ['rewrite_rules', '', 'yes'],
        ['hack_file', '0', 'yes'],
        ['blog_charset', 'UTF-8', 'yes'],
        ['moderation_keys', '', 'no'],
        ['active_plugins', 'a:1:{i:0;s:31:"casa-enhanced/casa-enhanced.php";}', 'yes'],
        ['category_base', '', 'yes'],
        ['ping_sites', "http://rpc.pingomatic.com/", 'yes'],
        ['comment_max_links', '2', 'yes'],
        ['gmt_offset', '-5', 'yes'],
        ['default_email_category', '1', 'yes'],
        ['recently_edited', '', 'no'],
        ['template', 'twentytwentyfour', 'yes'],
        ['stylesheet', 'twentytwentyfour', 'yes'],
        ['comment_whitelist', '1', 'yes'],
        ['blacklist_keys', '', 'no'],
        ['comment_registration', '0', 'yes'],
        ['html_type', 'text/html', 'yes'],
        ['use_trackback', '0', 'yes'],
        ['default_role', 'subscriber', 'yes'],
        ['db_version', '57155', 'yes'],
        ['uploads_use_yearmonth_folders', '1', 'yes'],
        ['upload_path', '', 'yes'],
        ['blog_public', '0', 'yes'],
        ['default_link_category', '2', 'yes'],
        ['show_on_front', 'posts', 'yes'],
        ['tag_base', '', 'yes'],
        ['show_avatars', '1', 'yes'],
        ['avatar_rating', 'G', 'yes'],
        ['upload_url_path', '', 'yes'],
        ['thumbnail_size_w', '150', 'yes'],
        ['thumbnail_size_h', '150', 'yes'],
        ['thumbnail_crop', '1', 'yes'],
        ['medium_size_w', '300', 'yes'],
        ['medium_size_h', '300', 'yes'],
        ['avatar_default', 'mystery', 'yes'],
        ['large_size_w', '1024', 'yes'],
        ['large_size_h', '1024', 'yes'],
        ['image_default_link_type', 'none', 'yes'],
        ['image_default_size', '', 'yes'],
        ['image_default_align', '', 'yes'],
        ['close_comments_for_old_posts', '0', 'yes'],
        ['close_comments_days_old', '14', 'yes'],
        ['thread_comments', '1', 'yes'],
        ['thread_comments_depth', '5', 'yes'],
        ['page_comments', '0', 'yes'],
        ['comments_per_page', '50', 'yes'],
        ['default_comments_page', 'newest', 'yes'],
        ['comment_order', 'asc', 'yes'],
        ['sticky_posts', 'a:0:{}', 'yes'],
        ['widget_categories', 'a:0:{}', 'yes'],
        ['widget_text', 'a:0:{}', 'yes'],
        ['widget_rss', 'a:0:{}', 'yes'],
        ['timezone_string', 'America/New_York', 'yes'],
        ['page_for_posts', '0', 'yes'],
        ['page_on_front', '0', 'yes'],
        ['default_post_format', '0', 'yes'],
        ['link_manager_enabled', '0', 'yes'],
        ['initial_db_version', '57155', 'yes'],
        ['wp_user_roles', 'a:5:{s:13:"administrator";a:2:{s:4:"name";s:13:"Administrator";s:12:"capabilities";a:61:{s:13:"switch_themes";b:1;s:11:"edit_themes";b:1;s:16:"activate_plugins";b:1;s:12:"edit_plugins";b:1;s:10:"edit_users";b:1;s:10:"edit_files";b:1;s:14:"manage_options";b:1;s:17:"moderate_comments";b:1;s:17:"manage_categories";b:1;s:12:"manage_links";b:1;s:12:"upload_files";b:1;s:6:"import";b:1;s:15:"unfiltered_html";b:1;s:10:"edit_posts";b:1;s:17:"edit_others_posts";b:1;s:20:"edit_published_posts";b:1;s:13:"publish_posts";b:1;s:10:"edit_pages";b:1;s:4:"read";b:1;s:8:"level_10";b:1;s:7:"level_9";b:1;s:7:"level_8";b:1;s:7:"level_7";b:1;s:7:"level_6";b:1;s:7:"level_5";b:1;s:7:"level_4";b:1;s:7:"level_3";b:1;s:7:"level_2";b:1;s:7:"level_1";b:1;s:7:"level_0";b:1;s:17:"edit_others_pages";b:1;s:20:"edit_published_pages";b:1;s:13:"publish_pages";b:1;s:12:"delete_pages";b:1;s:19:"delete_others_pages";b:1;s:22:"delete_published_pages";b:1;s:12:"delete_posts";b:1;s:19:"delete_others_posts";b:1;s:22:"delete_published_posts";b:1;s:20:"delete_private_posts";b:1;s:18:"edit_private_posts";b:1;s:18:"read_private_posts";b:1;s:20:"delete_private_pages";b:1;s:18:"edit_private_pages";b:1;s:18:"read_private_pages";b:1;s:12:"delete_users";b:1;s:12:"create_users";b:1;s:17:"unfiltered_upload";b:1;s:14:"edit_dashboard";b:1;s:14:"update_plugins";b:1;s:14:"delete_plugins";b:1;s:15:"install_plugins";b:1;s:13:"update_themes";b:1;s:14:"install_themes";b:1;s:11:"update_core";b:1;s:10:"list_users";b:1;s:12:"remove_users";b:1;s:13:"promote_users";b:1;s:18:"edit_theme_options";b:1;s:13:"delete_themes";b:1;s:6:"export";b:1;}}s:6:"editor";a:2:{s:4:"name";s:6:"Editor";s:12:"capabilities";a:34:{s:17:"moderate_comments";b:1;s:17:"manage_categories";b:1;s:12:"manage_links";b:1;s:12:"upload_files";b:1;s:15:"unfiltered_html";b:1;s:10:"edit_posts";b:1;s:17:"edit_others_posts";b:1;s:20:"edit_published_posts";b:1;s:13:"publish_posts";b:1;s:10:"edit_pages";b:1;s:4:"read";b:1;s:7:"level_7";b:1;s:7:"level_6";b:1;s:7:"level_5";b:1;s:7:"level_4";b:1;s:7:"level_3";b:1;s:7:"level_2";b:1;s:7:"level_1";b:1;s:7:"level_0";b:1;s:17:"edit_others_pages";b:1;s:20:"edit_published_pages";b:1;s:13:"publish_pages";b:1;s:12:"delete_pages";b:1;s:19:"delete_others_pages";b:1;s:22:"delete_published_pages";b:1;s:12:"delete_posts";b:1;s:19:"delete_others_posts";b:1;s:22:"delete_published_posts";b:1;s:20:"delete_private_posts";b:1;s:18:"edit_private_posts";b:1;s:18:"read_private_posts";b:1;s:20:"delete_private_pages";b:1;s:18:"edit_private_pages";b:1;s:18:"read_private_pages";b:1;}}s:6:"author";a:2:{s:4:"name";s:6:"Author";s:12:"capabilities";a:10:{s:12:"upload_files";b:1;s:10:"edit_posts";b:1;s:20:"edit_published_posts";b:1;s:13:"publish_posts";b:1;s:4:"read";b:1;s:7:"level_2";b:1;s:7:"level_1";b:1;s:7:"level_0";b:1;s:12:"delete_posts";b:1;s:22:"delete_published_posts";b:1;}}s:11:"contributor";a:2:{s:4:"name";s:11:"Contributor";s:12:"capabilities";a:5:{s:10:"edit_posts";b:1;s:4:"read";b:1;s:7:"level_1";b:1;s:7:"level_0";b:1;s:12:"delete_posts";b:1;}}s:10:"subscriber";a:2:{s:4:"name";s:10:"Subscriber";s:12:"capabilities";a:2:{s:4:"read";b:1;s:7:"level_0";b:1;}}}', 'yes'],
        ['cron', 'a:0:{}', 'yes'],
        ['widget_search', 'a:0:{}', 'yes'],
        ['widget_recent-posts', 'a:0:{}', 'yes'],
        ['widget_recent-comments', 'a:0:{}', 'yes'],
        ['widget_archives', 'a:0:{}', 'yes'],
        ['widget_meta', 'a:0:{}', 'yes'],
        ['sidebars_widgets', 'a:0:{}', 'yes'],
        ['finished_splitting_shared_terms', '1', 'yes'],
        ['site_icon', '0', 'yes'],
        ['medium_large_size_w', '768', 'yes'],
        ['medium_large_size_h', '0', 'yes'],
        ['wp_page_for_privacy_policy', '0', 'yes'],
        ['show_comments_cookies_opt_in', '1', 'yes'],
        ['admin_email_lifespan', (string)(time() + 15552000), 'yes'],
        ['disallowed_keys', '', 'no'],
        ['comment_previously_approved', '1', 'yes'],
        ['auto_plugin_theme_update_emails', 'a:0:{}', 'no'],
        ['auto_update_core_dev', 'enabled', 'yes'],
        ['auto_update_core_minor', 'enabled', 'yes'],
        ['auto_update_core_major', 'unset', 'yes'],
        ['wp_force_deactivated_plugins', 'a:0:{}', 'yes'],
        ['recovery_keys', 'a:0:{}', 'yes'],
    ];

    foreach ($options as $opt) {
        $mysqli->query("INSERT INTO `{$table_prefix}options` (option_name, option_value, autoload) VALUES ('{$opt[0]}', '{$mysqli->real_escape_string($opt[1])}', '{$opt[2]}')");
    }

    // Insert default category
    $mysqli->query("INSERT INTO `{$table_prefix}terms` (term_id, name, slug, term_group) VALUES (1, 'Uncategorized', 'uncategorized', 0)");
    $mysqli->query("INSERT INTO `{$table_prefix}term_taxonomy` (term_taxonomy_id, term_id, taxonomy, description, parent, count) VALUES (1, 1, 'category', '', 0, 0)");

    $mysqli->close();

    echo json_encode([
        'success' => true,
        'message' => 'WordPress installed successfully!',
        'tables_created' => $created,
        'admin' => [
            'user_id' => $user_id,
            'username' => 'walter_admin',
            'email' => 'walter@joneswebdesigns.com',
            'password' => $admin_password,
            'important' => 'SAVE THIS PASSWORD! Change it after first login.'
        ]
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
