<?php
require_once __DIR__ . '/../config.php';
$user = requireAuth(); 

$items = $body['items'] ?? null;
if (!$items || !is_array($items) || count($items) === 0)
    respond(['success' => false, 'error' => 'Cart is empty'], 400);

$name    = trim($body['name'] ?? '');
$email   = strtolower(trim($body['email'] ?? ($user['email'] ?? '')));
$phone   = trim($body['phone'] ?? '');
$address = trim($body['address'] ?? '');
$city    = trim($body['city'] ?? '');
$pincode = trim($body['pincode'] ?? '');
$payment = strtolower(trim($body['payment_method'] ?? 'cod'));
$txnId   = trim($body['transaction_id'] ?? '');

if (!$name || !$phone || !$address || !$city || !$pincode)
    respond(['success' => false, 'error' => 'All shipping details are required'], 400);

$paymentStatus = ($payment === 'stripe' || $payment === 'payhere') ? 'paid' : 'pending';
if (!$txnId && $paymentStatus === 'paid') {
    $txnId = strtoupper($payment) . '_' . bin2hex(random_bytes(8));
}
$requested = [];
foreach ($items as $it) {
    $pid = (int)($it['product_id'] ?? 0); $qty = (int)($it['quantity'] ?? 0);
    if ($pid <= 0 || $qty <= 0) continue;
    $requested[$pid] = ($requested[$pid] ?? 0) + $qty;
}
if (!$requested) respond(['success' => false, 'error' => 'Cart is empty'], 400);

$pdo->beginTransaction();
try {
    $validated = []; $total = 0;
    $productStmt = $pdo->prepare('SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE');
    foreach ($requested as $pid => $qty) {
        $productStmt->execute([$pid]);
        $p = $productStmt->fetch();
        if (!$p) throw new RuntimeException("Product #$pid not found");
        if ((int)$p['stock'] < $qty) throw new RuntimeException("Not enough stock for product #$pid");
        $validated[] = ['product_id' => $pid, 'name' => $p['name'], 'quantity' => $qty, 'price' => $p['price']];
        $total += $p['price'] * $qty;
    }

    // Coupon validation & discount calculation
    $couponCode = strtoupper(trim($body['coupon_code'] ?? ''));
    $discountVal = 0;

    if ($couponCode) {
        $cStmt = $pdo->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1");
        $cStmt->execute([$couponCode]);
        $cData = $cStmt->fetch();
        if (!$cData) {
            throw new RuntimeException("Promo code '$couponCode' is invalid or disabled.");
        }
        $minSpend = floatval($cData['min_spend'] ?? 0);
        if ($minSpend > 0 && $total < $minSpend) {
            throw new RuntimeException("Coupon '$couponCode' requires a minimum order spend of Rs. " . number_format($minSpend, 2));
        }

        if (isset($cData['discount_percent']) && $cData['discount_percent'] > 0) {
            $discountVal = round(($total * floatval($cData['discount_percent'])) / 100, 2);
        } else if (isset($cData['discount_amount'])) {
            $discountVal = min($total, floatval($cData['discount_amount']));
        }
    }
