# WordPress Headless Backend Setup Guide

This guide will help you set up the WordPress backend for your SaaS platform.

## Prerequisites

- PHP 8.0 or higher
- MySQL 5.7 or higher
- WordPress hosting (local, VPS, or managed hosting)
- Basic understanding of WordPress administration

## Step 1: WordPress Installation

### Option A: Local Development (Recommended for testing)

1. **Install Local by Flywheel or XAMPP**
   - Download and install [Local by Flywheel](https://localwp.com/) for easy local WordPress development
   - Or use XAMPP/MAMP for traditional local server setup

2. **Create a new WordPress site**
   - Site name: `wordpress-saas-backend`
   - Admin username: Choose a secure username
   - Admin password: Choose a strong password
   - Admin email: Your email address

### Option B: Managed WordPress Hosting

1. **Recommended hosts for headless WordPress:**
   - [WP Engine](https://wpengine.com/) - Excellent for headless setups
   - [Kinsta](https://kinsta.com/) - Great performance and security
   - [Pantheon](https://pantheon.io/) - Developer-friendly

2. **Create a new WordPress installation**
   - Follow your hosting provider's WordPress installation process
   - Note down your WordPress admin URL, username, and password

### Option C: VPS Setup (Advanced)

1. **Server requirements:**
   - Ubuntu 20.04+ or CentOS 8+
   - 2GB RAM minimum
   - 20GB storage minimum

2. **Install LAMP stack:**
   ```bash
   # Ubuntu example
   sudo apt update
   sudo apt install apache2 mysql-server php php-mysql php-curl php-gd php-xml php-mbstring
   ```

3. **Download and install WordPress:**
   ```bash
   cd /var/www/html
   sudo wget https://wordpress.org/latest.tar.gz
   sudo tar -xzf latest.tar.gz
   sudo chown -R www-data:www-data wordpress
   ```

## Step 2: Install Required Plugins

### Essential Plugins

1. **JWT Authentication for WP REST API**
   - Plugin URL: https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
   - Purpose: Handles JWT token authentication for API access

2. **Formidable Forms Pro**
   - Plugin URL: https://formidableforms.com/
   - **Note**: This is a premium plugin (required for advanced features)
   - Purpose: Advanced form builder and management

3. **Custom Post Type UI**
   - Plugin URL: https://wordpress.org/plugins/custom-post-type-ui/
   - Purpose: Create custom post types for tenant management

4. **Advanced Custom Fields (ACF)**
   - Plugin URL: https://wordpress.org/plugins/advanced-custom-fields/
   - Purpose: Add custom fields for tenant settings

### Installation Methods

**Method 1: WordPress Admin (Recommended)**
1. Log into your WordPress admin panel
2. Go to Plugins → Add New
3. Search for each plugin name
4. Install and activate each plugin

**Method 2: Upload Plugin Files**
1. Download plugin ZIP files
2. Go to Plugins → Add New → Upload Plugin
3. Upload and activate each plugin

**Method 3: FTP Upload (Advanced)**
1. Upload plugin folders to `/wp-content/plugins/`
2. Activate plugins from WordPress admin

## Step 3: Configure JWT Authentication

1. **Edit wp-config.php**
   Add these lines before `/* That's all, stop editing! */`:
   ```php
   // JWT Auth Secret Key
   define('JWT_AUTH_SECRET_KEY', 'your-super-secret-jwt-key-here');
   define('JWT_AUTH_CORS_ENABLE', true);
   ```

2. **Edit .htaccess** (if using Apache)
   Add these lines to enable Authorization header:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTP:Authorization} ^(.*)
   RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
   ```

3. **Test JWT Authentication**
   - Visit: `your-site.com/wp-json/jwt-auth/v1/`
   - You should see JWT endpoints listed

## Step 4: Create Custom Multi-Tenant Plugin

Create a new file: `/wp-content/plugins/saas-multitenancy/saas-multitenancy.php`

```php
<?php
/**
 * Plugin Name: SaaS Multi-Tenancy
 * Description: Multi-tenant functionality for WordPress SaaS platform
 * Version: 1.0.0
 * Author: Your Name
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin activation hook
register_activation_hook(__FILE__, 'saas_create_tables');

function saas_create_tables() {
    global $wpdb;
    
    // Create tenants table
    $table_name = $wpdb->prefix . 'tenants';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        name varchar(255) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        domain varchar(255),
        status enum('active','inactive','suspended') DEFAULT 'active',
        settings longtext,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    // Create tenant_users table
    $table_name = $wpdb->prefix . 'tenant_users';
    
    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        tenant_id bigint(20) NOT NULL,
        user_id bigint(20) NOT NULL,
        role varchar(50) DEFAULT 'member',
        status enum('active','inactive') DEFAULT 'active',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY tenant_user (tenant_id, user_id)
    ) $charset_collate;";
    
    dbDelta($sql);
}

// Add REST API endpoints
add_action('rest_api_init', 'saas_register_routes');

function saas_register_routes() {
    register_rest_route('saas/v1', '/tenants', array(
        'methods' => 'GET',
        'callback' => 'saas_get_tenants',
        'permission_callback' => 'saas_check_permissions'
    ));
    
    register_rest_route('saas/v1', '/tenants', array(
        'methods' => 'POST',
        'callback' => 'saas_create_tenant',
        'permission_callback' => 'saas_check_permissions'
    ));
    
    // Add more endpoints as needed
}

function saas_check_permissions() {
    return current_user_can('manage_options');
}

function saas_get_tenants($request) {
    global $wpdb;
    
    $table_name = $wpdb->prefix . 'tenants';
    $tenants = $wpdb->get_results("SELECT * FROM $table_name");
    
    return rest_ensure_response($tenants);
}

function saas_create_tenant($request) {
    global $wpdb;
    
    $name = sanitize_text_field($request['name']);
    $slug = sanitize_title($request['slug']);
    
    $table_name = $wpdb->prefix . 'tenants';
    
    $result = $wpdb->insert(
        $table_name,
        array(
            'name' => $name,
            'slug' => $slug,
            'settings' => json_encode(array())
        )
    );
    
    if ($result) {
        return rest_ensure_response(array('success' => true, 'id' => $wpdb->insert_id));
    } else {
        return new WP_Error('creation_failed', 'Failed to create tenant', array('status' => 500));
    }
}

// Tenant detection middleware
add_action('init', 'saas_detect_tenant');

function saas_detect_tenant() {
    // Get tenant from subdomain or header
    $tenant_slug = null;
    
    // Method 1: Subdomain detection
    $host = $_SERVER['HTTP_HOST'];
    $parts = explode('.', $host);
    if (count($parts) >= 3) {
        $tenant_slug = $parts[0];
    }
    
    // Method 2: X-Tenant-ID header
    if (!$tenant_slug && isset($_SERVER['HTTP_X_TENANT_ID'])) {
        $tenant_slug = $_SERVER['HTTP_X_TENANT_ID'];
    }
    
    if ($tenant_slug) {
        // Store tenant context
        define('CURRENT_TENANT', $tenant_slug);
        
        // Add tenant filter to queries
        add_filter('posts_where', 'saas_filter_posts_by_tenant');
    }
}

function saas_filter_posts_by_tenant($where) {
    global $wpdb;
    
    if (defined('CURRENT_TENANT') && !is_admin()) {
        $tenant_slug = CURRENT_TENANT;
        $where .= $wpdb->prepare(" AND {$wpdb->posts}.post_excerpt = %s", $tenant_slug);
    }
    
    return $where;
}
?>
```

## Step 5: Configure Formidable Forms

1. **Activate Formidable Forms Pro**
   - Enter your license key in Formidable → Global Settings

2. **Create API User**
   - Go to Users → Add New
   - Username: `api_user`
   - Role: Administrator (temporary for setup)
   - Strong password

3. **Configure Form Settings**
   - Go to Formidable → Global Settings
   - Enable "Load jQuery" if needed
   - Configure email settings

## Step 6: Set Up CORS (Cross-Origin Resource Sharing)

Add to your theme's `functions.php` or create a must-use plugin:

```php
// Enable CORS for REST API
add_action('init', 'handle_preflight');
function handle_preflight() {
    $origin = get_http_origin();
    
    if ($origin && in_array($origin, [
        'http://localhost:3000',
        'https://your-frontend-domain.vercel.app',
        'https://your-custom-domain.com'
    ])) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID');
        
        if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
            exit(0);
        }
    }
}
```

## Step 7: Test Your Setup

1. **Test WordPress REST API**
   - Visit: `your-site.com/wp-json/wp/v2/`
   - Should return JSON with API endpoints

2. **Test JWT Authentication**
   ```bash
   curl -X POST your-site.com/wp-json/jwt-auth/v1/token \
     -H "Content-Type: application/json" \
     -d '{"username":"your-username","password":"your-password"}'
   ```

3. **Test Custom Endpoints**
   - Visit: `your-site.com/wp-json/saas/v1/tenants`
   - Should return tenant data (may be empty initially)

4. **Test Formidable Forms API**
   - Visit: `your-site.com/wp-json/frm/v2/forms`
   - Should return forms data

## Step 8: Environment Configuration

Update your frontend `.env.local` file:

```env
WORDPRESS_API_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your_wp_username
WORDPRESS_PASSWORD=your_wp_password
JWT_SECRET=your_jwt_secret_key_here
```

## Security Considerations

1. **Use HTTPS in production**
2. **Limit user capabilities** - Create specific API user roles
3. **Enable fail2ban** for brute force protection
4. **Regular updates** - Keep WordPress and plugins updated
5. **Strong passwords** for all accounts
6. **Database backups** - Regular automated backups
7. **Firewall configuration** - Restrict access to wp-admin if possible

## Troubleshooting

### Common Issues:

1. **JWT Token Issues**
   - Check if JWT_AUTH_SECRET_KEY is defined
   - Verify .htaccess configuration
   - Check server logs for authentication errors

2. **CORS Errors**
   - Verify CORS headers are set correctly
   - Check if origin domain is whitelisted
   - Test with browser dev tools

3. **API Access Issues**
   - Verify user permissions
   - Check if REST API is enabled
   - Test endpoints with tools like Postman

4. **Plugin Conflicts**
   - Deactivate other plugins to isolate issues
   - Check error logs for PHP errors
   - Test with default theme

### Debug Mode

Enable WordPress debug mode by adding to wp-config.php:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

## Next Steps

1. Connect your React frontend to the WordPress backend
2. Create forms in Formidable Forms
3. Test multi-tenant functionality
4. Set up user registration and management
5. Configure email notifications
6. Implement data export features

## Support Resources

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [Formidable Forms Documentation](https://formidableforms.com/knowledgebase/)
- [JWT Authentication Plugin Docs](https://github.com/Tmeister/wp-api-jwt-auth)

Remember to keep your WordPress installation, plugins, and themes updated for security and compatibility.