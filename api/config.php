<?php
// Helper function to read env vars safely from getenv, $_ENV, or $_SERVER
function getEnvVar($key, $default = '') {
    $val = getenv($key);
    if ($val !== false && $val !== '') return $val;
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') return $_ENV[$key];
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') return $_SERVER[$key];
    return $default;
}

// Load local .env file if present
$envFile = dirname(__DIR__) . '/.env';
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/.env';
}
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val, " \t\n\r\0\x0B\"'");
            putenv("$key=$val");
            $_ENV[$key] = $val;
            $_SERVER[$key] = $val;
        }
    }
}

// Global Environment-Aware Exception Handler
set_exception_handler(function($e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    $env = getEnvVar('APP_ENV', 'local');
    $errMsg = ($env === 'production') ? 'An unexpected server error occurred.' : 'Server Error: ' . $e->getMessage();
    
    // Log exception to file
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    @file_put_contents($logDir . '/error.log', sprintf("[%s] %s in %s:%d\nStack Trace:\n%s\n", date('Y-m-d H:i:s'), $e->getMessage(), $e->getFile(), $e->getLine(), $e->getTraceAsString()), FILE_APPEND);
    
    echo json_encode(['success' => false, 'error' => $errMsg]);
    exit;
});

// Restricted CORS Header Setup
$allowedOrigin = rtrim((string)(getEnvVar('APP_ORIGIN', 'http://localhost')), '/');
$requestOrigin = rtrim($_SERVER['HTTP_ORIGIN'] ?? '', '/');
if ($requestOrigin !== '' && ($requestOrigin === $allowedOrigin || str_starts_with($requestOrigin, 'http://localhost'))) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . ($allowedOrigin ?: 'http://localhost'));
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit(0);

$host = getEnvVar('DB_HOST', 'sql302.infinityfree.com');
$db   = getEnvVar('DB_NAME', 'if0_42757057_bloombonsaidatabase');
$user = getEnvVar('DB_USER', 'if0_42757057');
$pass = getEnvVar('DB_PASSWORD', '12345slA');

try {
    // Try connecting to InfinityFree MySQL database via TCP port 3306
    $pdo = new PDO("mysql:host=$host;port=3306;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    // Try local 127.0.0.1 TCP connection for local XAMPP
    try {
        $pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=bloom_bonsai;charset=utf8mb4", "root", "", [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $localErr) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database connection failed: Please set DB_PASSWORD in api/config.php or .env file']);
        exit;
    }
}

if (!function_exists('respond')) {
    function respond($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data);
        exit;
    }
}

// File-based Rate Limiter Helper Function
function checkRateLimit($actionKey, $maxAttempts = 6, $decaySeconds = 600) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $hashKey = md5($actionKey . '_' . $ip);
    $tmpDir = sys_get_temp_dir() . '/bloom_rate_limits';
    if (!is_dir($tmpDir)) @mkdir($tmpDir, 0755, true);
    $file = $tmpDir . '/' . $hashKey . '.json';
    
    $now = time();
    $data = ['attempts' => 0, 'first_attempt' => $now];
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        $decoded = @json_decode($raw, true);
        if (is_array($decoded)) $data = $decoded;
    }
    
    // Reset counter if decay period has passed
    if ($now - $data['first_attempt'] > $decaySeconds) {
        $data = ['attempts' => 0, 'first_attempt' => $now];
    }
    
    if ($data['attempts'] >= $maxAttempts) {
        $retryAfter = $decaySeconds - ($now - $data['first_attempt']);
        respond([
            'success' => false,
            'error' => 'Too many requests. Please try again in ' . ceil($retryAfter / 60) . ' minutes.'
        ], 429);
    }
    
    $data['attempts']++;
    @file_put_contents($file, json_encode($data));
}

$rawInput = file_get_contents('php://input');
$jsonBody = json_decode($rawInput, true);
$body = is_array($jsonBody) ? $jsonBody : (is_array($_POST) && !empty($_POST) ? $_POST : []);

// Shipping rule: free above Rs. 10,000 (within 50 KM range), else flat Rs. 350
function calcShipping($subtotal) {
    return $subtotal >= 10000 ? 0 : 350;
}

// Save an uploaded image (field name = $field) into api/uploads/
// Returns the public URL path, or null on failure.
function uploadImage($field, $pdo) {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return null;

    $file = $_FILES[$field];
    if ($file['size'] > 5 * 1024 * 1024) return null;              // max 5MB
    $info = @getimagesize($file['tmp_name']);
    if ($info === false) return null;                              // not a real image

    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime']] ?? null;
    if ($ext === null) return null;
    $uploadDir = __DIR__ . '/uploads';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) return null;
    $name = 'img_' . bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = $uploadDir . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $dest)) return null;
    return 'api/uploads/' . $name;
}

// Automated Email Receipt & Tracking Alert Helper
function sendOrderEmail($order, $type = 'confirmation') {
    $email = $order['email'] ?? ($order['shipping_email'] ?? '');
    if (!$email) return false;

    $subject = ($type === 'confirmation') 
        ? "🌱 Order Confirmation — Bloom & Bonsai (Order #BB-" . $order['id'] . ")"
        : "🚚 Order Status Update: " . ucfirst($order['status']) . " (Order #BB-" . $order['id'] . ")";

    $statusBadge = match($order['status'] ?? 'pending') {
        'confirmed' => '<span style="background:#d1e7dd;color:#0f5132;padding:4px 12px;border-radius:12px;font-weight:bold;">Confirmed</span>',
        'packed'    => '<span style="background:#cff4fc;color:#055160;padding:4px 12px;border-radius:12px;font-weight:bold;">Packed</span>',
        'shipped'   => '<span style="background:#fff3cd;color:#664d03;padding:4px 12px;border-radius:12px;font-weight:bold;">Shipped</span>',
        'delivered' => '<span style="background:#17482f;color:#fff;padding:4px 12px;border-radius:12px;font-weight:bold;">Delivered</span>',
        default     => '<span style="background:#e2e3e5;color:#41464b;padding:4px 12px;border-radius:12px;font-weight:bold;">Processing</span>'
    };

    $itemsHtml = '';
    if (!empty($order['items'])) {
        foreach ($order['items'] as $item) {
            $itemsHtml .= '<tr>' .
                '<td style="padding:10px;border-bottom:1px solid #eee;">' . htmlspecialchars($item['name'] ?? $item['product_name'] ?? 'Botanical Plant') . '</td>' .
                '<td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">' . intval($item['quantity'] ?? 1) . '</td>' .
                '<td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">Rs' . number_format($item['price'] ?? 0, 2) . '</td>' .
                '</tr>';
        }
    } else {
        $itemsHtml = '<tr><td colspan="3" style="padding:10px;text-align:center;color:#777;">Order items details included.</td></tr>';
    }

    $html = '
    <div style="font-family:\'Outfit\',Segoe UI,sans-serif;max-width:600px;margin:0 auto;background:#f9fbf9;border-radius:16px;padding:24px;border:1px solid #e0eae3;">
        <div style="text-align:center;margin-bottom:20px;">
            <h1 style="color:#17482f;margin:0;">🌿 Bloom & Bonsai</h1>
            <p style="color:#666;font-size:0.9rem;margin-top:4px;">Luxury Botanicals & Garden Design</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
            <h2 style="color:#17482f;margin-top:0;">' . ($type === 'confirmation' ? 'Thank You for Your Order!' : 'Order Status Update') . '</h2>
            <p>Order Reference: <strong>#BB-' . $order['id'] . '</strong></p>
            <p>Status: ' . $statusBadge . '</p>
            <p>Payment Method: <strong>' . strtoupper($order['payment_method'] ?? 'cod') . '</strong> (' . ucfirst($order['payment_status'] ?? 'pending') . ')</p>
            
            <h3 style="margin-top:20px;border-bottom:2px solid #17482f;padding-bottom:6px;color:#17482f;">Items Summary</h3>
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:#f4f8f5;color:#17482f;">
                        <th style="padding:10px;text-align:left;">Item</th>
                        <th style="padding:10px;text-align:center;">Qty</th>
                        <th style="padding:10px;text-align:right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $itemsHtml . '
                </tbody>
            </table>
            
            <div style="margin-top:16px;text-align:right;font-size:1.1rem;font-weight:bold;color:#17482f;">
                Total Amount: Rs' . number_format($order['total_amount'] ?? $order['total'] ?? 0, 2) . '
            </div>
            
            <h3 style="margin-top:20px;color:#17482f;">Shipping Address</h3>
            <p style="color:#555;line-height:1.6;">' . nl2br(htmlspecialchars($order['address'] ?? $order['shipping_address'] ?? 'Customer Address')) . '</p>
        </div>
        <div style="text-align:center;margin-top:20px;color:#888;font-size:0.8rem;">
            © ' . date('Y') . ' Bloom & Bonsai. All rights reserved.
        </div>
    </div>';

    // Log email dispatch to file
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    $logMsg = sprintf("[%s] [%s] Sent email to %s for Order #BB-%s | Subject: %s\n", date('Y-m-d H:i:s'), strtoupper($type), $email, $order['id'], $subject);
    @file_put_contents($logDir . '/email.log', $logMsg, FILE_APPEND);

    // If PHP mail() is enabled on server:
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: Bloom & Bonsai <noreply@bloombonsai.com>\r\n";
    @mail($email, $subject, $html, $headers);

    return true;
}

require_once __DIR__ . '/auth.php';
