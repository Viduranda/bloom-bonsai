<?php
require_once __DIR__ . '/../config.php';
requireAdmin();

$stats = [];
$stats['products']  = (int)$pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
$stats['users']     = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$stats['orders']    = (int)$pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$stats['revenue']   = (float)$pdo->query('SELECT COALESCE(SUM(total),0) FROM orders WHERE status != "cancelled"')->fetchColumn();
try {
    $stats['recent_orders'] = $pdo->query('SELECT * FROM v_recent_orders LIMIT 10')->fetchAll();
} catch (Exception $e) {
    $stats['recent_orders'] = $pdo->query('SELECT o.id, o.user_id, o.total, o.status, o.shipping_address, o.customer_name, o.phone, o.city, o.pincode, o.payment_method, o.expected_delivery, o.created_at,
                                                  COALESCE(o.customer_name, u.name, "Customer") AS user_name,
                                                  COALESCE(u.email, "") AS user_email
                                           FROM orders o
                                           LEFT JOIN users u ON u.id = o.user_id
                                           ORDER BY o.created_at DESC LIMIT 10')->fetchAll();
}

respond(['success' => true, 'data' => $stats]);
