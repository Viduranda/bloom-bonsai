<?php
// api/admin/coupons/delete.php — Delete a promo coupon code
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../auth.php';
requireAdmin();

$id = intval($body['id'] ?? $_GET['id'] ?? 0);
if (!$id) respond(['success' => false, 'error' => 'Coupon ID required'], 400);

$stmt = $pdo->prepare("DELETE FROM coupons WHERE id = ?");
$stmt->execute([$id]);

respond([
    'success' => true,
    'message' => "Promo coupon deleted successfully."
]);
