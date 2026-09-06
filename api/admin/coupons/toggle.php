<?php
// api/admin/coupons/toggle.php — Toggle active status of a promo code
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../auth.php';
requireAdmin();

$id = intval($body['id'] ?? $_POST['id'] ?? 0);
if (!$id) respond(['success' => false, 'error' => 'Coupon ID required'], 400);

$stmt = $pdo->prepare("SELECT id, code, is_active FROM coupons WHERE id = ?");
$stmt->execute([$id]);
$coupon = $stmt->fetch();

if (!$coupon) respond(['success' => false, 'error' => 'Coupon not found'], 404);

$nextState = $coupon['is_active'] ? 0 : 1;
$up = $pdo->prepare("UPDATE coupons SET is_active = ? WHERE id = ?");
$up->execute([$nextState, $id]);

respond([
    'success' => true,
    'is_active' => $nextState,
    'message' => "Coupon '{$coupon['code']}' is now " . ($nextState ? "Active 🟢" : "Disabled 🔴")
]);
