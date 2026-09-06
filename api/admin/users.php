<?php
// ============================================================
// api/admin/users.php — Manage Registered Customers
// ============================================================
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
$admin = requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("
        SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
               COUNT(o.id) AS total_orders,
               COALESCE(SUM(o.total), 0) AS total_spent
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
        GROUP BY u.id
        ORDER BY u.id DESC
    ");
    $users = $stmt->fetchAll();
    respond(['success' => true, 'data' => $users]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $userId = (int)($body['id'] ?? $body['user_id'] ?? 0);
    $role = trim($body['role'] ?? 'customer');
    if (!$userId) respond(['success' => false, 'error' => 'User ID is required'], 400);
    if (!in_array($role, ['customer', 'admin'])) respond(['success' => false, 'error' => 'Invalid role'], 400);

    $upd = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
    $upd->execute([$role, $userId]);
    respond(['success' => true, 'message' => 'Role updated successfully']);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $userId = (int)($body['user_id'] ?? $_GET['user_id'] ?? $_GET['id'] ?? 0);
    if (!$userId) respond(['success' => false, 'error' => 'User ID is required'], 400);
    if ($userId === (int)$admin['user_id']) respond(['success' => false, 'error' => 'Cannot delete active admin session'], 400);

    $del = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $del->execute([$userId]);
    respond(['success' => true, 'message' => 'User deleted successfully']);
}

respond(['success' => false, 'error' => 'Method not allowed'], 405);
