#!/bin/bash
set -e

# GCP Cloud Run entrypoint for WordPress
# This script configures WordPress to work with Cloud SQL

echo "Starting WordPress initialization..."

# Copy WordPress files if they don't exist (from /usr/src/wordpress)
if [ ! -f /var/www/html/wp-includes/version.php ]; then
    echo "WordPress files not found, copying from /usr/src/wordpress..."
    if [ -d /usr/src/wordpress ]; then
        cp -r /usr/src/wordpress/* /var/www/html/
        echo "WordPress files copied successfully"
    else
        echo "ERROR: /usr/src/wordpress not found!"
        exit 1
    fi
fi

# Wait for database to be ready (Cloud SQL via Cloud Run's automatic connection)
echo "Waiting for database connection..."

# Generate wp-config.php if it doesn't exist
if [ ! -f /var/www/html/wp-config.php ]; then
    echo "Creating wp-config.php..."

    cat > /var/www/html/wp-config.php << 'WPCONFIG'
<?php
/**
 * WordPress Configuration for GCP Cloud Run
 * Database credentials are loaded from environment variables
 */

// Database settings from environment
define('DB_NAME', getenv('WORDPRESS_DB_NAME') ?: 'wordpress');
define('DB_USER', getenv('WORDPRESS_DB_USER') ?: 'wordpress');
define('DB_PASSWORD', getenv('WORDPRESS_DB_PASSWORD') ?: '');

// For Cloud SQL Unix socket connection
// Format: localhost:/path/to/socket for mysqli
$db_host_env = getenv('WORDPRESS_DB_HOST') ?: '127.0.0.1';
if (strpos($db_host_env, '/cloudsql/') === 0) {
    // Cloud SQL socket - use localhost:socket_path format
    define('DB_HOST', 'localhost:' . $db_host_env);
} else {
    define('DB_HOST', $db_host_env);
}
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

// Authentication keys and salts - set via environment for security
define('AUTH_KEY',         getenv('WORDPRESS_AUTH_KEY') ?: 'put your unique phrase here');
define('SECURE_AUTH_KEY',  getenv('WORDPRESS_SECURE_AUTH_KEY') ?: 'put your unique phrase here');
define('LOGGED_IN_KEY',    getenv('WORDPRESS_LOGGED_IN_KEY') ?: 'put your unique phrase here');
define('NONCE_KEY',        getenv('WORDPRESS_NONCE_KEY') ?: 'put your unique phrase here');
define('AUTH_SALT',        getenv('WORDPRESS_AUTH_SALT') ?: 'put your unique phrase here');
define('SECURE_AUTH_SALT', getenv('WORDPRESS_SECURE_AUTH_SALT') ?: 'put your unique phrase here');
define('LOGGED_IN_SALT',   getenv('WORDPRESS_LOGGED_IN_SALT') ?: 'put your unique phrase here');
define('NONCE_SALT',       getenv('WORDPRESS_NONCE_SALT') ?: 'put your unique phrase here');

// WordPress database table prefix
$table_prefix = getenv('WORDPRESS_TABLE_PREFIX') ?: 'wp_';

// JWT Authentication settings
define('JWT_AUTH_SECRET_KEY', getenv('JWT_SECRET_KEY') ?: 'your-secret-key');
define('JWT_AUTH_CORS_ENABLE', true);

// Site URLs - dynamically set from environment or request
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? getenv('WORDPRESS_SITE_URL') ?? 'localhost';
define('WP_SITEURL', getenv('WORDPRESS_SITE_URL') ?: $protocol . $host);
define('WP_HOME', getenv('WORDPRESS_HOME_URL') ?: $protocol . $host);

// GCP Cloud Storage for media uploads (optional)
if (getenv('GCS_BUCKET_NAME')) {
    define('GCS_BUCKET_NAME', getenv('GCS_BUCKET_NAME'));
}

// Brevo (Sendinblue) API for transactional emails
if (getenv('BREVO_API_KEY')) {
    define('BREVO_API_KEY', getenv('BREVO_API_KEY'));
}
if (getenv('BREVO_SENDER_EMAIL')) {
    define('BREVO_SENDER_EMAIL', getenv('BREVO_SENDER_EMAIL'));
}
if (getenv('BREVO_SENDER_NAME')) {
    define('BREVO_SENDER_NAME', getenv('BREVO_SENDER_NAME'));
}

// Security settings for Cloud Run
define('FORCE_SSL_ADMIN', true);
$_SERVER['HTTPS'] = 'on';

// Disable file editing in admin
define('DISALLOW_FILE_EDIT', true);

// Allow multisite if needed
define('WP_ALLOW_MULTISITE', false);

// Debugging (disable in production)
define('WP_DEBUG', getenv('WP_DEBUG') === 'true');
define('WP_DEBUG_LOG', getenv('WP_DEBUG') === 'true');
define('WP_DEBUG_DISPLAY', false);

// Memory limit
define('WP_MEMORY_LIMIT', '256M');
define('WP_MAX_MEMORY_LIMIT', '512M');

// CORS headers for headless frontend
header('Access-Control-Allow-Origin: ' . (getenv('FRONTEND_URL') ?: '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Absolute path to the WordPress directory
if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

// Sets up WordPress vars and included files
require_once ABSPATH . 'wp-settings.php';
WPCONFIG

    echo "wp-config.php created successfully"
fi

# Set proper permissions
chown -R www-data:www-data /var/www/html

# Start Apache
exec "$@"
