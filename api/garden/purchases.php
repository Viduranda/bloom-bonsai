<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

$user = getUserFromToken();
if (!$user) {
    respond(['success' => true, 'purchases' => [], 'data' => []]);
}

try {
    $stmt = $pdo->prepare("
        SELECT oi.id, oi.product_id, oi.quantity, oi.price_at_purchase AS price, o.created_at AS purchase_date,
               p.name, p.scientific_name, p.image, p.category_id, p.care_plan, c.name AS category_name
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE o.user_id = ? AND o.status != 'cancelled'
        ORDER BY o.created_at DESC
    ");
    $stmt->execute([$user['user_id']]);
    $purchases = $stmt->fetchAll();
    respond(['success' => true, 'purchases' => $purchases, 'data' => $purchases]);
} catch (Exception $e) {
    respond(['success' => true, 'purchases' => [], 'data' => []]);
}
