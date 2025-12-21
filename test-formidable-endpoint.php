<?php
/**
 * Test script to check if Formidable Forms endpoint is working
 */

// Test the endpoint directly
$url = 'http://casa-backend.local/wp-json/casa/v1/formidable/test';

echo "Testing endpoint: $url\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Accept: application/json'
));

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $http_code\n";
echo "Response: $response\n";

// Test the submit endpoint
$submit_url = 'http://casa-backend.local/wp-json/casa/v1/formidable/submit';
$test_data = json_encode(array(
    'form_id' => 6,
    'data' => array(
        'item_meta[1]' => 'Test Child',
        'item_meta[2]' => 'Test Last',
        'item_meta[6]' => 'TEST-001',
        'item_meta[7]' => 'dependency'
    )
));

echo "\nTesting submit endpoint: $submit_url\n";
echo "Test data: $test_data\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $submit_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $test_data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Accept: application/json'
));

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "Submit HTTP Code: $http_code\n";
echo "Submit Response: $response\n";
?>


