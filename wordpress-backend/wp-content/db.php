<?php
/**
 * Cloud SQL Socket Database Drop-in
 *
 * This overrides WordPress's default database connection
 * to properly handle Cloud SQL Unix socket connections.
 */

// Only activate for Cloud SQL socket paths
$cloud_sql_socket = getenv('WORDPRESS_DB_HOST');
if (!$cloud_sql_socket || strpos($cloud_sql_socket, '/cloudsql/') !== 0) {
    return; // Let WordPress handle normal connections
}

// Include the WordPress database class
require_once ABSPATH . WPINC . '/class-wpdb.php';

/**
 * Extended wpdb class for Cloud SQL Unix socket support
 */
class wpdb_cloudsql extends wpdb {

    /**
     * Cloud SQL socket path
     */
    protected $cloudsql_socket;

    /**
     * Constructor
     */
    public function __construct($dbuser, $dbpassword, $dbname, $dbhost) {
        $this->cloudsql_socket = getenv('WORDPRESS_DB_HOST');

        // Call parent with localhost - we'll override the connection
        parent::__construct($dbuser, $dbpassword, $dbname, 'localhost');
    }

    /**
     * Connect to the database using Unix socket
     */
    public function db_connect($allow_bail = true) {
        $this->is_mysql = true;

        $client_flags = defined('MYSQL_CLIENT_FLAGS') ? MYSQL_CLIENT_FLAGS : 0;

        // Initialize mysqli
        $this->dbh = mysqli_init();

        if (!$this->dbh) {
            if ($allow_bail) {
                $this->bail('mysqli_init failed', 'db_connect_fail');
            }
            return false;
        }

        // Set connection timeout
        mysqli_options($this->dbh, MYSQLI_OPT_CONNECT_TIMEOUT, 10);

        // Connect using Unix socket (null host for socket connection)
        $connected = @mysqli_real_connect(
            $this->dbh,
            null,                     // host - null for socket
            $this->dbuser,            // username
            $this->dbpassword,        // password
            null,                     // database - select after
            null,                     // port - null for socket
            $this->cloudsql_socket,   // socket path
            $client_flags
        );

        if (!$connected) {
            $error = mysqli_connect_error();
            $errno = mysqli_connect_errno();

            $this->dbh = null;

            if ($allow_bail) {
                $this->bail(
                    sprintf(
                        'Cloud SQL connection failed: [%d] %s (Socket: %s)',
                        $errno,
                        $error,
                        $this->cloudsql_socket
                    ),
                    'db_connect_fail'
                );
            }

            return false;
        }

        // Select database
        if ($this->dbname) {
            if (!mysqli_select_db($this->dbh, $this->dbname)) {
                if ($allow_bail) {
                    $this->bail('Failed to select database: ' . $this->dbname, 'db_select_fail');
                }
                return false;
            }
        }

        $this->ready = true;
        $this->has_connected = true;

        // Set charset
        $this->set_charset($this->dbh);
        $this->set_sql_mode();

        return true;
    }
}

// Create the global wpdb instance
$wpdb = new wpdb_cloudsql(DB_USER, DB_PASSWORD, DB_NAME, 'localhost');
