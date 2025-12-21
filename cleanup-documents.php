<?php
/**
 * Cleanup all documents script
 */

// Include WordPress
require_once('../casa/wordpress-backend/wp-config.php');
require_once(ABSPATH . 'wp-includes/wp-db.php');

global $wpdb;

echo "<h1>🧹 CASA Document Cleanup</h1>\n";
echo "<p>Starting cleanup of all documents...</p>\n";

try {
    $documents_table = $wpdb->prefix . 'casa_documents';
    
    // Get all documents with their attachment IDs
    $documents = $wpdb->get_results("SELECT * FROM $documents_table");
    $deleted_attachments = 0;
    
    echo "<p>Found " . count($documents) . " documents to clean up.</p>\n";
    
    // Delete WordPress attachments and their files
    foreach ($documents as $document) {
        if ($document->attachment_id) {
            echo "<p>Deleting attachment ID: {$document->attachment_id}</p>\n";
            // Delete the attachment and its file
            $deleted = wp_delete_attachment($document->attachment_id, true);
            if ($deleted) {
                $deleted_attachments++;
                echo "<p>✅ Deleted attachment {$document->attachment_id}</p>\n";
            } else {
                echo "<p>❌ Failed to delete attachment {$document->attachment_id}</p>\n";
            }
        }
    }
    
    // Delete all documents from database
    $deleted_docs = $wpdb->query("DELETE FROM $documents_table");
    echo "<p>🗄️ Deleted {$deleted_docs} documents from database.</p>\n";
    
    // Clean up any organization directories
    $upload_dir = wp_upload_dir();
    $base_upload_path = $upload_dir['basedir'];
    
    // Look for casa-org-* directories
    $casa_dirs = glob($base_upload_path . '/casa-org-*');
    $deleted_dirs = 0;
    
    echo "<p>Found " . count($casa_dirs) . " organization directories to clean up.</p>\n";
    
    foreach ($casa_dirs as $dir) {
        if (is_dir($dir)) {
            echo "<p>Removing directory: {$dir}</p>\n";
            // Remove directory and all contents
            $result = removeDirectoryRecursive($dir);
            if ($result) {
                $deleted_dirs++;
                echo "<p>✅ Deleted directory: {$dir}</p>\n";
            } else {
                echo "<p>❌ Failed to delete directory: {$dir}</p>\n";
            }
        }
    }
    
    echo "<h2>✅ Cleanup Complete!</h2>\n";
    echo "<ul>\n";
    echo "<li>📄 Deleted documents: {$deleted_docs}</li>\n";
    echo "<li>📎 Deleted attachments: {$deleted_attachments}</li>\n";
    echo "<li>📁 Deleted directories: {$deleted_dirs}</li>\n";
    echo "</ul>\n";
    
} catch (Exception $e) {
    echo "<h2>❌ Error during cleanup:</h2>\n";
    echo "<p>" . $e->getMessage() . "</p>\n";
}

// Helper function to recursively remove directory
function removeDirectoryRecursive($dir) {
    if (!is_dir($dir)) {
        return false;
    }
    
    $files = array_diff(scandir($dir), array('.', '..'));
    
    foreach ($files as $file) {
        $path = $dir . '/' . $file;
        if (is_dir($path)) {
            removeDirectoryRecursive($path);
        } else {
            unlink($path);
        }
    }
    
    return rmdir($dir);
}

echo "<p><a href='http://localhost:3000/documents'>↩️ Back to Documents Page</a></p>\n";
?>