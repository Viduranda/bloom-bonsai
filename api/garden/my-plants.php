<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';

$user = getUserFromToken();
if (!$user) {
    respond(['success' => true, 'plants' => [], 'data' => []]);
}

try {
    $stmt = $pdo->prepare("
        SELECT oi.id, oi.product_id, oi.quantity, oi.price_at_purchase AS price, o.created_at AS purchase_date,
               p.name, p.name AS plant_name, p.scientific_name, p.scientific_name AS species, p.image, p.image AS image_url,
               p.category_id, p.care_plan, 'healthy' AS health_status, c.name AS category_name
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE o.user_id = ? AND o.status != 'cancelled'
        ORDER BY o.created_at DESC
    ");
    $stmt->execute([$user['user_id']]);
    $plants = $stmt->fetchAll();

    if (empty($plants)) {
        try {
            $chk = $pdo->prepare("SELECT id, plant_name, species, image_url, health_status FROM user_plants WHERE user_id = ?");
            $chk->execute([$user['user_id']]);
            $plants = $chk->fetchAll();
        } catch (Exception $ex) {}
    }

    respond(['success' => true, 'plants' => $plants, 'data' => $plants]);
} catch (Exception $e) {
    respond(['success' => true, 'plants' => [], 'data' => []]);
}
