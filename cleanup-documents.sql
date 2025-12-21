-- CASA Document Cleanup SQL Script
-- This will delete all documents from the database

-- Show current document count
SELECT COUNT(*) as 'Current Document Count' FROM wp_casa_documents;

-- Delete all documents
DELETE FROM wp_casa_documents;

-- Show new document count (should be 0)
SELECT COUNT(*) as 'Documents After Cleanup' FROM wp_casa_documents;

-- Reset auto-increment counter to start fresh
ALTER TABLE wp_casa_documents AUTO_INCREMENT = 1;

SELECT 'Document cleanup complete! All documents have been removed.' as 'Status';