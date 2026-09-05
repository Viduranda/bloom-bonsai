<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $orders = $pdo->query('SELECT o.id, o.id AS order_id, o.user_id, o.total, o.coupon_code, o.discount_amount, o.status,
                                  o.shipping_address, o.customer_name, o.phone, o.city, o.pincode, o.payment_method,
                                  o.expected_delivery, o.created_at,
                                  COALESCE(o.customer_name, u.name, "Customer") AS customer,
                                  COALESCE(o.customer_name, u.name, "Customer") AS customer_name,
                                  COALESCE(u.email, "") AS email
                           FROM orders o
                           LEFT JOIN users u ON u.id = o.user_id
                           ORDER BY o.created_at DESC')->fetchAll();

    $itemsStmt = $pdo->prepare('SELECT oi.id, oi.product_id, oi.quantity, oi.price_at_purchase,
                                       p.name AS product_name, p.image
                                FROM order_items oi
                                LEFT JOIN products p ON p.id = oi.product_id
                                WHERE oi.order_id = ?');

    foreach ($orders as &$o) {
        $itemsStmt->execute([$o['id']]);
        $o['items'] = $itemsStmt->fetchAll();
        $o['total_items'] = count($o['items']);
    }

    respond(['success' => true, 'data' => $orders]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $order_id = (int)($body['order_id'] ?? 0);
    $status   = $body['status'] ?? '';
    $allowed  = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!$order_id || !in_array($status, $allowed, true)) {
        respond(['success' => false, 'error' => 'Valid order_id and status required'], 400);
    }
    $pdo->prepare('UPDATE orders SET status = ?, status_updated_at = NOW() WHERE id = ?')->execute([$status, $order_id]);
    $pdo->prepare('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)')
        ->execute([$order_id, $status, 'Status updated by administrator']);

    // Fetch order details & user email to send tracking update alert
    $stmt = $pdo->prepare('SELECT o.*, u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.id = ?');
    $stmt->execute([$order_id]);
    $order = $stmt->fetch();
    if ($order) {
        $order['email'] = $order['user_email'] ?? '';
        sendOrderEmail($order, 'tracking_update');
    }

    respond(['success' => true, 'data' => ['message' => 'Order updated & tracking email sent']]);
}

respond(['success' => false, 'error' => 'Method not allowed'], 405);
