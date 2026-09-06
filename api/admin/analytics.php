<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
$adminUser = requireAdmin();

try {
    // 1. Low stock items (stock < 3)
    $lowStockStmt = $pdo->query("
        SELECT p.id, p.name, p.stock, p.price, p.image, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.stock < 3
        ORDER BY p.stock ASC
    ");
    $lowStockItems = $lowStockStmt->fetchAll();

    // 2. Revenue by Category
    $catRevenueStmt = $pdo->query("
        SELECT COALESCE(c.name, 'Uncategorized') AS category, 
               COALESCE(SUM(oi.price_at_purchase * oi.quantity), 0) AS total_revenue,
               COALESCE(SUM(oi.quantity), 0) AS items_sold
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelled'
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
    ");
    $categoryRevenue = $catRevenueStmt->fetchAll();

    // 3. Overall Sales Totals
    $totalRevStmt = $pdo->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'");
    $totalRevenue = (float)$totalRevStmt->fetchColumn();

    $totalOrdersStmt = $pdo->query("SELECT COUNT(*) FROM orders");
    $totalOrders = (int)$totalOrdersStmt->fetchColumn();

    respond([
        'success' => true,
        'data' => [
            'low_stock_items' => $lowStockItems,
            'low_stock_count' => count($lowStockItems),
            'category_revenue' => $categoryRevenue,
            'total_revenue' => $totalRevenue,
            'total_orders' => $totalOrders
        ]
    ]);
} catch (PDOException $e) {
    respond(['success' => false, 'error' => $e->getMessage()], 500);
}
