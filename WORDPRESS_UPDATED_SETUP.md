# WordPress Backend Setup for CASA Case Management

## Prerequisites
- WordPress installation (Local by Flywheel recommended)
- Admin access to WordPress
- CASA Enhanced plugin files

## Step 1: Install Required Plugins

### 1.1 JWT Authentication Plugin
```bash
# Install via WordPress Admin or WP-CLI
wp plugin install jwt-authentication-for-wp-rest-api --activate
```

### 1.2 CASA Enhanced Plugin
1. Copy `wordpress-backend/plugins/casa-enhanced/` to your WordPress `wp-content/plugins/` directory
2. Activate the plugin in WordPress Admin → Plugins

## Step 2: Configure JWT Authentication

### 2.1 Update wp-config.php
Add this line to your `wp-config.php` file (before "That's all, stop editing!"):

```php
// JWT Authentication Secret Key
define('JWT_AUTH_SECRET_KEY', 'FJKYBTl0;1=17fw52(]Mxp_Tq.zXZXy4KkS)MnxD28)m1[$(W)K<WjSw[ruIR|XA');

// Enable CORS for API requests
define('JWT_AUTH_CORS_ENABLE', true);
```

### 2.2 Update .htaccess
Add these rules to your `.htaccess` file:

```apache
# Enable Authorization Header
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule ^(.*) - [E=HTTP_AUTHORIZATION:%1]

# CORS Headers for API
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With"
    Header always set Access-Control-Allow-Credentials "true"
</IfModule>

# Handle preflight requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]
```

## Step 3: Create WordPress Users

### 3.1 Create Test Users
Create these users in WordPress Admin → Users:

1. **Administrator User**
   - Username: `admin` or your preferred username
   - Email: `walterjonesjr@gmail.com` (or your email)
   - Role: Administrator
   - Password: `W4lt3rj0n3s@` (or your preferred password)

2. **Demo Coordinator**
   - Username: `coordinator`
   - Email: `coordinator@demo-casa.org`
   - Role: Editor (will be mapped to CASA roles)
   - Password: `password123`

3. **Demo Volunteer**
   - Username: `volunteer`
   - Email: `volunteer@demo-casa.org`
   - Role: Author
   - Password: `password123`

## Step 4: Test the Installation

### 4.1 Test JWT Authentication
```bash
# Test from terminal
curl -X POST http://casa-backend.local/wp-json/jwt-auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_admin_password"
  }'
```

Expected response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user_email": "admin@example.com",
  "user_nicename": "admin",
  "user_display_name": "Admin User"
}
```

### 4.2 Test CASA API Endpoints
```bash
# Test case creation (with JWT token)
curl -X POST http://casa-backend.local/wp-json/casa/v1/cases \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "child_first_name": "Test",
    "child_last_name": "Child",
    "case_number": "TEST-001",
    "case_type": "dependency",
    "case_summary": "Test case creation"
  }'
```

### 4.3 Test Contact Log Creation
```bash
curl -X POST http://casa-backend.local/wp-json/casa/v1/contact-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "case_number": "TEST-001",
    "child_name": "Test Child",
    "contact_type": "home-visit",
    "contact_date": "2024-12-15",
    "summary": "Test contact log"
  }'
```

## Step 5: Frontend Configuration

### 5.1 Update Environment Variables
Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_WORDPRESS_URL=http://casa-backend.local
```

### 5.2 Test Frontend Connection
1. Start the Next.js dev server: `npm run dev`
2. Go to `http://localhost:3000/auth/login`
3. Try logging in with your WordPress credentials
4. Test creating a case at `http://localhost:3000/cases/intake`
5. Test creating a contact log at `http://localhost:3000/contacts/log`

## Step 6: Verify Custom Post Types

After plugin activation, check WordPress Admin for:
- **CASA Cases** menu item
- **CASA Volunteers** menu item  
- **Contact Logs** menu item
- **CASA Reports** menu item

These should appear in the WordPress admin sidebar.

## Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Ensure `.htaccess` CORS headers are properly set
   - Check that your WordPress URL matches `NEXT_PUBLIC_WORDPRESS_URL`

2. **Authentication Failures**
   - Verify JWT secret key is set in `wp-config.php`
   - Ensure WordPress user exists with correct credentials
   - Check that Authorization header is enabled in `.htaccess`

3. **API 404 Errors**
   - Confirm CASA Enhanced plugin is activated
   - Try visiting WordPress Admin → Settings → Permalinks and click "Save Changes" to flush rewrite rules

4. **Form Submission Failures**
   - Check browser console for detailed error messages
   - Verify user is logged in with valid JWT token
   - Confirm required fields are filled in form

### Debug Commands:

```bash
# Check if WordPress is accessible
curl -s http://casa-backend.local/wp-json/

# Check if JWT endpoint is available
curl -s http://casa-backend.local/wp-json/jwt-auth/v1/

# Check if CASA endpoints are available
curl -s http://casa-backend.local/wp-json/casa/v1/
```

## Success Indicators

✅ WordPress responds to API requests  
✅ JWT authentication returns valid tokens  
✅ CASA API endpoints are available  
✅ Custom post types appear in WordPress admin  
✅ Frontend can successfully login  
✅ Forms can create cases and contact logs  
✅ Data appears in WordPress admin panels