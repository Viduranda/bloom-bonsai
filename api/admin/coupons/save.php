<?php
// api/admin/coupons/save.php — Create or edit a promo coupon code
require_once __DIR__ . '/../../config.php';
requireAdmin();

$id              = isset($body['id']) ? intval($body['id']) : 0;
$code            = strtoupper(trim($body['code'] ?? ''));
$discountType    = trim($body['discount_type'] ?? 'percent'); // 'percent' or 'amount'
$discountVal     = floatval($body['discount_value'] ?? 0);
$minSpend        = floatval($body['min_spend'] ?? 0);
$expiryDate      = !empty($body['expiry_date']) ? trim($body['expiry_date']) : null;
$isActive        = isset($body['is_active']) ? intval($body['is_active']) : 1;

if (!$code) {
    respond(['success' => false, 'error' => 'Coupon code is required.'], 400);
}

if ($discountVal <= 0) {
    respond(['success' => false, 'error' => 'Discount value must be greater than 0.'], 400);
}

$discountPercent = ($discountType === 'percent') ? $discountVal : 0;
$discountAmount  = ($discountType === 'amount') ? $discountVal : 0;

if ($id > 0) {
    // Check if code exists on another coupon ID
    $chk = $pdo->prepare("SELECT id FROM coupons WHERE code = ? AND id != ?");
    $chk->execute([$code, $id]);
    if ($chk->fetch()) {
        respond(['success' => false, 'error' => "Coupon code '$code' already exists."], 400);
    }

    $stmt = $pdo->prepare("
        UPDATE coupons 
        SET code = ?, discount_percent = ?, discount_amount = ?, min_spend = ?, expiry_date = ?, is_active = ?
        WHERE id = ?
    ");
    $stmt->execute([$code, $discountPercent, $discountAmount, $minSpend, $expiryDate, $isActive, $id]);
    
    respond([
        'success' => true,
        'message' => "Promo coupon '$code' updated successfully! 🎉"
    ]);
} else {
    // Check if code exists
    $chk = $pdo->prepare("SELECT id FROM coupons WHERE code = ?");
    $chk->execute([$code]);
    if ($chk->fetch()) {
        respond(['success' => false, 'error' => "Coupon code '$code' already exists."], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO coupons (code, discount_percent, discount_amount, min_spend, expiry_date, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$code, $discountPercent, $discountAmount, $minSpend, $expiryDate, $isActive]);

    respond([
        'success' => true,
        'message' => "Promo coupon '$code' created successfully! 🎉"
    ]);
}
