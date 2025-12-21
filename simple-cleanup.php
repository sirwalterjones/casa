<?php
// Simple cleanup - just output SQL commands you can copy/paste

echo "=== CASA Document Cleanup SQL Commands ===\n\n";

echo "-- 1. Check current document count:\n";
echo "SELECT COUNT(*) as 'Current Documents' FROM wp_casa_documents;\n\n";

echo "-- 2. Delete all documents:\n";
echo "DELETE FROM wp_casa_documents;\n\n";

echo "-- 3. Reset auto-increment:\n"; 
echo "ALTER TABLE wp_casa_documents AUTO_INCREMENT = 1;\n\n";

echo "-- 4. Verify cleanup:\n";
echo "SELECT COUNT(*) as 'Documents After Cleanup' FROM wp_casa_documents;\n\n";

echo "=== Copy and run these SQL commands in your database ===\n";
?>