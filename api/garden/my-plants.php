<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

$user = getUserFromToken();
if (!$user) {
    respond(['success' => true, 'plants' => []]);
}

try {
    $stmt = $pdo->prepare("
        SELECT ug.*, p.name AS catalog_name, p.image AS catalog_image, p.care_plan
        FROM user_garden ug
        LEFT JOIN products p ON p.id = ug.product_id
        WHERE ug.user_id = ?
        ORDER BY ug.added_at DESC
    ");
    $stmt->execute([$user['user_id']]);
    $plants = $stmt->fetchAll();
    respond(['success' => true, 'plants' => $plants]);
} catch (Exception $e) {
    respond(['success' => true, 'plants' => []]);
}
