<?php
/**
 * Database connection debug script
 * This helps identify Cloud SQL socket connection issues
 */

header('Content-Type: text/plain');

echo "=== Database Connection Debug ===\n\n";

// Environment variables
$db_host = getenv('WORDPRESS_DB_HOST') ?: 'NOT SET';
$db_name = getenv('WORDPRESS_DB_NAME') ?: 'NOT SET';
$db_user = getenv('WORDPRESS_DB_USER') ?: 'NOT SET';
$db_pass = getenv('WORDPRESS_DB_PASSWORD') ? '[SET]' : 'NOT SET';

echo "Environment Variables:\n";
echo "WORDPRESS_DB_HOST: $db_host\n";
echo "WORDPRESS_DB_NAME: $db_name\n";
echo "WORDPRESS_DB_USER: $db_user\n";
echo "WORDPRESS_DB_PASSWORD: $db_pass\n\n";

// Check if socket path exists
if (strpos($db_host, '/cloudsql/') !== false) {
    $socket_path = $db_host;
    if (strpos($socket_path, 'localhost:') === 0) {
        $socket_path = substr($socket_path, 10);
    }

    echo "Socket Path: $socket_path\n";
    echo "Socket exists: " . (file_exists($socket_path) ? 'YES' : 'NO') . "\n";

    // Check directory
    $socket_dir = dirname($socket_path);
    echo "Socket directory: $socket_dir\n";
    echo "Directory exists: " . (is_dir($socket_dir) ? 'YES' : 'NO') . "\n";

    if (is_dir($socket_dir)) {
        echo "Directory contents:\n";
        $files = scandir($socket_dir);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                echo "  - $file\n";
            }
        }
    }

    // Check /cloudsql directory
    echo "\n/cloudsql directory exists: " . (is_dir('/cloudsql') ? 'YES' : 'NO') . "\n";
    if (is_dir('/cloudsql')) {
        echo "/cloudsql contents:\n";
        $files = scandir('/cloudsql');
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                echo "  - $file\n";
            }
        }
    }
}

echo "\n=== Testing Connections ===\n\n";

// Test 1: Direct socket connection
echo "Test 1: Direct mysqli socket connection\n";
$socket = getenv('WORDPRESS_DB_HOST');
$mysqli = mysqli_init();
$result = @mysqli_real_connect(
    $mysqli,
    null,
    getenv('WORDPRESS_DB_USER'),
    getenv('WORDPRESS_DB_PASSWORD'),
    getenv('WORDPRESS_DB_NAME'),
    null,
    $socket
);
if ($result) {
    echo "SUCCESS! Connected via socket.\n";
    mysqli_close($mysqli);
} else {
    echo "FAILED: " . mysqli_connect_error() . "\n";
}

// Test 2: localhost:socket format
echo "\nTest 2: localhost:socket format\n";
$host = 'localhost:' . getenv('WORDPRESS_DB_HOST');
$mysqli2 = @new mysqli(
    $host,
    getenv('WORDPRESS_DB_USER'),
    getenv('WORDPRESS_DB_PASSWORD'),
    getenv('WORDPRESS_DB_NAME')
);
if ($mysqli2->connect_error) {
    echo "FAILED: " . $mysqli2->connect_error . "\n";
} else {
    echo "SUCCESS! Connected via localhost:socket.\n";
    $mysqli2->close();
}

// Test 3: PDO with socket
echo "\nTest 3: PDO with unix_socket\n";
try {
    $dsn = sprintf(
        'mysql:unix_socket=%s;dbname=%s;charset=utf8mb4',
        getenv('WORDPRESS_DB_HOST'),
        getenv('WORDPRESS_DB_NAME')
    );
    $pdo = new PDO(
        $dsn,
        getenv('WORDPRESS_DB_USER'),
        getenv('WORDPRESS_DB_PASSWORD')
    );
    echo "SUCCESS! PDO connected.\n";
    $pdo = null;
} catch (PDOException $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}

echo "\n=== End Debug ===\n";
