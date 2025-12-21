<?php
/**
 * Custom database drop-in for Cloud SQL Unix socket support
 *
 * This file is loaded by WordPress before the default wpdb class
 * and enables proper Unix socket connections for Cloud SQL.
 */

// Only modify behavior if using Cloud SQL socket
$cloud_sql_socket = getenv('WORDPRESS_DB_HOST');
if ($cloud_sql_socket && strpos($cloud_sql_socket, '/cloudsql/') === 0) {

    /**
     * Custom wpdb class that supports Cloud SQL Unix sockets
     */
    class wpdb_cloudsql extends wpdb {

        /**
         * Connect to the database using mysqli with Unix socket
         */
        public function db_connect($allow_bail = true) {
            $this->is_mysql = true;

            $client_flags = defined('MYSQL_CLIENT_FLAGS') ? MYSQL_CLIENT_FLAGS : 0;

            // Create mysqli connection
            $this->dbh = mysqli_init();

            if (!$this->dbh) {
                $this->bail('mysqli_init failed');
                return false;
            }

            // Get socket path from environment
            $socket = getenv('WORDPRESS_DB_HOST');

            // Set connection options
            mysqli_options($this->dbh, MYSQLI_OPT_CONNECT_TIMEOUT, 10);

            // Connect using Unix socket
            // Parameters: host, user, password, database, port, socket
            $connected = @mysqli_real_connect(
                $this->dbh,
                null,           // host - null for socket connection
                $this->dbuser,
                $this->dbpassword,
                null,           // database - select later
                null,           // port - null for socket
                $socket,        // socket path
                $client_flags
            );

            if (!$connected) {
                $error_message = mysqli_connect_error();
                $this->dbh = null;

                // Log detailed error for debugging
                error_log("Cloud SQL connection failed: $error_message");
                error_log("Socket path: $socket");
                error_log("User: {$this->dbuser}");

                if ($allow_bail) {
                    $this->bail(sprintf(
                        'Error establishing Cloud SQL connection. Socket: %s, Error: %s',
                        $socket,
                        $error_message
                    ), 'db_connect_fail');
                }

                return false;
            }

            // Select database
            if ($this->dbname) {
                $selected = mysqli_select_db($this->dbh, $this->dbname);
                if (!$selected) {
                    error_log("Failed to select database: {$this->dbname}");
                    return false;
                }
            }

            // Set charset
            $this->set_charset($this->dbh);

            $this->ready = true;
            $this->set_sql_mode();
            $this->init_charset();

            return true;
        }
    }

    // Replace the global wpdb with our custom class
    $GLOBALS['wpdb'] = new wpdb_cloudsql(
        defined('DB_USER') ? DB_USER : '',
        defined('DB_PASSWORD') ? DB_PASSWORD : '',
        defined('DB_NAME') ? DB_NAME : '',
        'localhost' // This is ignored, we use socket
    );
}
