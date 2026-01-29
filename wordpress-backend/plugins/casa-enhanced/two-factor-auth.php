<?php
/**
 * CASA Two-Factor Authentication via Email
 *
 * Provides email-based 2FA for the CASA case management system.
 * Generates 6-digit codes sent via email that expire after 10 minutes.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Create 2FA codes table
 */
function casa_create_2fa_table() {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();
    $table_name = $wpdb->prefix . 'casa_2fa_codes';

    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        code varchar(6) NOT NULL,
        temp_token varchar(64) NOT NULL,
        expires_at datetime NOT NULL,
        used tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id),
        KEY temp_token (temp_token),
        KEY expires_at (expires_at)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

/**
 * Register 2FA REST routes
 */
function casa_register_2fa_routes() {
    // Verify 2FA code endpoint
    register_rest_route('casa/v1', '/auth/verify-2fa', array(
        'methods' => 'POST',
        'callback' => 'casa_verify_2fa_code',
        'permission_callback' => '__return_true'
    ));

    // Resend 2FA code endpoint
    register_rest_route('casa/v1', '/auth/resend-2fa', array(
        'methods' => 'POST',
        'callback' => 'casa_resend_2fa_code',
        'permission_callback' => '__return_true'
    ));
}
add_action('rest_api_init', 'casa_register_2fa_routes');

/**
 * Generate a 6-digit code
 */
function casa_generate_2fa_code() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

/**
 * Generate a temporary token for 2FA session
 */
function casa_generate_temp_token() {
    return bin2hex(random_bytes(32));
}

/**
 * Create and send 2FA code to user
 *
 * @param int $user_id WordPress user ID
 * @return array|WP_Error Array with temp_token on success, WP_Error on failure
 */
function casa_create_and_send_2fa_code($user_id) {
    global $wpdb;

    $user = get_user_by('ID', $user_id);
    if (!$user) {
        return new WP_Error('invalid_user', 'User not found');
    }

    $table_name = $wpdb->prefix . 'casa_2fa_codes';

    // Invalidate any existing codes for this user
    $wpdb->update(
        $table_name,
        array('used' => 1),
        array('user_id' => $user_id, 'used' => 0)
    );

    // Generate new code and temp token
    $code = casa_generate_2fa_code();
    $temp_token = casa_generate_temp_token();
    $expires_at = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    // Store in database
    $inserted = $wpdb->insert(
        $table_name,
        array(
            'user_id' => $user_id,
            'code' => $code,
            'temp_token' => $temp_token,
            'expires_at' => $expires_at,
            'used' => 0
        ),
        array('%d', '%s', '%s', '%s', '%d')
    );

    if (!$inserted) {
        error_log('CASA 2FA: Failed to insert code into database');
        return new WP_Error('db_error', 'Failed to create verification code');
    }

    // Send email
    $email_sent = casa_send_2fa_email($user, $code);

    if (!$email_sent) {
        error_log('CASA 2FA: Failed to send email to ' . $user->user_email);
        return new WP_Error('email_error', 'Failed to send verification email');
    }

    return array(
        'temp_token' => $temp_token,
        'email' => casa_mask_email($user->user_email)
    );
}

/**
 * Send 2FA code via Brevo (Sendinblue) transactional email API
 *
 * @param WP_User $user WordPress user object
 * @param string $code 6-digit verification code
 * @return bool Success status
 */
function casa_send_2fa_email($user, $code) {
    $first_name = get_user_meta($user->ID, 'first_name', true) ?: $user->display_name;

    // Brevo API configuration - API key must be set via environment or wp-config.php
    $brevo_api_key = defined('BREVO_API_KEY') ? BREVO_API_KEY : getenv('BREVO_API_KEY');
    $sender_email = defined('BREVO_SENDER_EMAIL') ? BREVO_SENDER_EMAIL : (getenv('BREVO_SENDER_EMAIL') ?: 'notify@notifyplus.org');
    $sender_name = defined('BREVO_SENDER_NAME') ? BREVO_SENDER_NAME : (getenv('BREVO_SENDER_NAME') ?: 'PA-CASA');

    if (empty($brevo_api_key)) {
        error_log('CASA 2FA Error: BREVO_API_KEY not configured');
        return false;
    }

    $subject = 'PA-CASA Login Verification Code';

    $html_content = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .code-box {
                background: #f5f5f5;
                border: 2px solid #0066cc;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 20px 0;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #0066cc;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 4px;
                padding: 10px;
                margin-top: 20px;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <h2>Login Verification</h2>
            <p>Hello {$first_name},</p>
            <p>Your verification code for PA-CASA login is:</p>

            <div class='code-box'>
                <div class='code'>{$code}</div>
            </div>

            <p>This code will expire in <strong>10 minutes</strong>.</p>

            <div class='warning'>
                <strong>Security Notice:</strong> If you did not attempt to log in,
                please ignore this email and consider changing your password.
            </div>

            <div class='footer'>
                <p>This is an automated message from PA-CASA Case Management System.</p>
                <p>Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    ";

    // Brevo API endpoint
    $url = 'https://api.brevo.com/v3/smtp/email';

    $payload = array(
        'sender' => array(
            'name' => $sender_name,
            'email' => $sender_email
        ),
        'to' => array(
            array(
                'email' => $user->user_email,
                'name' => $first_name
            )
        ),
        'subject' => $subject,
        'htmlContent' => $html_content
    );

    $args = array(
        'method' => 'POST',
        'headers' => array(
            'accept' => 'application/json',
            'api-key' => $brevo_api_key,
            'content-type' => 'application/json'
        ),
        'body' => json_encode($payload),
        'timeout' => 30
    );

    $response = wp_remote_post($url, $args);

    if (is_wp_error($response)) {
        error_log('CASA 2FA Brevo Error: ' . $response->get_error_message());
        return false;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);

    if ($response_code >= 200 && $response_code < 300) {
        error_log('CASA 2FA: Email sent successfully to ' . $user->user_email);
        return true;
    } else {
        error_log('CASA 2FA Brevo Error: HTTP ' . $response_code . ' - ' . $response_body);
        return false;
    }
}

/**
 * Mask email for display (jo***@example.com)
 */
function casa_mask_email($email) {
    $parts = explode('@', $email);
    if (count($parts) !== 2) return '***@***.***';

    $name = $parts[0];
    $domain = $parts[1];

    $masked_name = substr($name, 0, 2) . str_repeat('*', max(3, strlen($name) - 2));

    return $masked_name . '@' . $domain;
}

/**
 * Verify 2FA code and complete login
 */
function casa_verify_2fa_code($request) {
    global $wpdb;

    $temp_token = $request->get_param('temp_token');
    $code = $request->get_param('code');
    $organization_slug = $request->get_param('organization_slug');

    if (empty($temp_token) || empty($code)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Missing required fields'
        ), 400);
    }

    $table_name = $wpdb->prefix . 'casa_2fa_codes';

    // Find the code record
    $record = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table_name
         WHERE temp_token = %s
         AND code = %s
         AND used = 0
         AND expires_at > NOW()",
        $temp_token,
        $code
    ));

    if (!$record) {
        // Check if code is expired
        $expired = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name
             WHERE temp_token = %s
             AND code = %s
             AND expires_at <= NOW()",
            $temp_token,
            $code
        ));

        if ($expired) {
            // Log expired 2FA code attempt
            $expired_user = get_user_by('ID', $expired->user_id);
            casa_log_audit('auth', '2fa_expired', array(
                'user_id' => $expired->user_id,
                'user_email' => $expired_user ? $expired_user->user_email : 'unknown',
                'status' => 'failure',
                'severity' => 'warning',
                'metadata' => array('reason' => 'code_expired')
            ));

            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Verification code has expired. Please request a new code.'
            ), 401);
        }

        // Log failed 2FA verification
        casa_log_audit('auth', '2fa_failed', array(
            'user_id' => 0,
            'user_email' => 'unknown',
            'status' => 'failure',
            'severity' => 'warning',
            'metadata' => array('reason' => 'invalid_code')
        ));

        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Invalid verification code'
        ), 401);
    }

    // Mark code as used
    $wpdb->update(
        $table_name,
        array('used' => 1),
        array('id' => $record->id)
    );

    // Get user
    $user = get_user_by('ID', $record->user_id);
    if (!$user) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'User not found'
        ), 404);
    }

    // Get organization - first try by slug, then try user's assigned org
    $organization = casa_get_organization_by_slug($organization_slug);
    if (!$organization) {
        // Try to get user's assigned organization instead of creating default
        global $wpdb;
        $user_org = $wpdb->get_row($wpdb->prepare(
            "SELECT o.* FROM {$wpdb->prefix}casa_organizations o
             JOIN {$wpdb->prefix}casa_user_organizations uo ON o.id = uo.organization_id
             WHERE uo.user_id = %d AND o.status = 'active'
             ORDER BY uo.id ASC LIMIT 1",
            $user->ID
        ));

        if ($user_org) {
            $organization = array(
                'id' => $user_org->id,
                'name' => $user_org->name,
                'slug' => $user_org->slug,
                'domain' => $user_org->domain,
                'status' => $user_org->status,
                'settings' => json_decode($user_org->settings, true),
                'createdAt' => $user_org->created_at,
                'updatedAt' => $user_org->updated_at
            );
        } else {
            // Only create default as last resort
            $organization = casa_create_default_organization($organization_slug);
        }
    }

    // Get CASA profile
    $casa_profile = casa_get_user_casa_profile($user->ID, $organization['id']);

    // Generate JWT token
    $token = casa_generate_jwt_token($user->ID);

    if (!$token) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Token generation failed'
        ), 500);
    }

    // Clean up old codes (older than 24 hours)
    $wpdb->query("DELETE FROM $table_name WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)");

    // Log successful login
    casa_log_audit('auth', 'login_success', array(
        'user_id' => $user->ID,
        'organization_id' => $organization['id'],
        'metadata' => array(
            'login_method' => '2fa_email',
            'organization_name' => $organization['name']
        )
    ));

    return new WP_REST_Response(array(
        'success' => true,
        'data' => array(
            'token' => $token,
            'user' => array(
                'id' => $user->ID,
                'email' => $user->user_email,
                'firstName' => get_user_meta($user->ID, 'first_name', true) ?: $user->display_name,
                'lastName' => get_user_meta($user->ID, 'last_name', true),
                'roles' => $user->roles,
                'casa_role' => $casa_profile['casa_role'],
                'organizationId' => $organization['id'],
                'isActive' => $casa_profile['status'] === 'active',
                'backgroundCheckStatus' => $casa_profile['background_check_status'],
                'trainingStatus' => $casa_profile['training_status'],
                'lastLogin' => current_time('mysql'),
                'createdAt' => $user->user_registered,
                'updatedAt' => current_time('mysql'),
            ),
            'organization' => $organization
        )
    ), 200);
}

/**
 * Resend 2FA code
 */
function casa_resend_2fa_code($request) {
    global $wpdb;

    $temp_token = $request->get_param('temp_token');

    if (empty($temp_token)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Missing temp_token'
        ), 400);
    }

    $table_name = $wpdb->prefix . 'casa_2fa_codes';

    // Find the user from the temp token
    $record = $wpdb->get_row($wpdb->prepare(
        "SELECT user_id FROM $table_name
         WHERE temp_token = %s
         ORDER BY created_at DESC
         LIMIT 1",
        $temp_token
    ));

    if (!$record) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Invalid session. Please log in again.'
        ), 401);
    }

    // Rate limiting: check if code was sent in last 60 seconds
    $recent = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table_name
         WHERE user_id = %d
         AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)",
        $record->user_id
    ));

    if ($recent > 0) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Please wait 60 seconds before requesting a new code.'
        ), 429);
    }

    // Create and send new code
    $result = casa_create_and_send_2fa_code($record->user_id);

    if (is_wp_error($result)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => $result->get_error_message()
        ), 500);
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Verification code sent',
        'data' => array(
            'temp_token' => $result['temp_token'],
            'email' => $result['email']
        )
    ), 200);
}

/**
 * Modified login function with 2FA
 * This replaces the original casa_enhanced_login function
 */
function casa_enhanced_login_with_2fa($request) {
    $username = $request->get_param('username');
    $password = $request->get_param('password');
    $organization_slug = $request->get_param('organization_slug');

    // Authenticate user credentials first
    $user = wp_authenticate($username, $password);

    if (is_wp_error($user)) {
        // Log failed login attempt
        casa_log_audit('auth', 'login_failure', array(
            'user_id' => 0,
            'user_email' => sanitize_email($username),
            'user_role' => 'unknown',
            'status' => 'failure',
            'severity' => 'warning',
            'metadata' => array(
                'reason' => 'invalid_credentials',
                'organization_slug' => $organization_slug
            )
        ));

        return new WP_REST_Response(array(
            'success' => false,
            'message' => 'Invalid credentials'
        ), 403);
    }

    // Create and send 2FA code
    $result = casa_create_and_send_2fa_code($user->ID);

    if (is_wp_error($result)) {
        return new WP_REST_Response(array(
            'success' => false,
            'message' => $result->get_error_message()
        ), 500);
    }

    // Log 2FA code sent
    casa_log_audit('auth', '2fa_code_sent', array(
        'user_id' => $user->ID,
        'metadata' => array(
            'organization_slug' => $organization_slug
        )
    ));

    // Return 2FA required response
    return new WP_REST_Response(array(
        'success' => true,
        'requires_2fa' => true,
        'message' => 'Verification code sent to your email',
        'data' => array(
            'temp_token' => $result['temp_token'],
            'email' => $result['email'],
            'organization_slug' => $organization_slug
        )
    ), 200);
}
