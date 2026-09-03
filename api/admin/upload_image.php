<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'error' => 'Method not allowed'], 405);
}

if (empty($_FILES['image'])) {
    respond(['success' => false, 'error' => 'No image file provided'], 400);
}

$url = uploadImage('image', $pdo);
if (!$url) {
    respond(['success' => false, 'error' => 'Upload failed. File must be JPG, PNG, or WEBP under 10MB.'], 400);
}

respond([
    'success' => true,
    'data' => [
        'url' => $url,
        'message' => 'Image uploaded successfully'
    ]
]);
