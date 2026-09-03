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
