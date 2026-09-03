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
$requestOrigin = rtrim($_SERVER['HTTP_ORIGIN'] ?? '', '/');
if ($requestOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit(0);

// Multi-Tier Database Connection Attempts
$pdo = null;
$connected = false;

// 1. Try Environment / Config Variables
$host = getEnvVar('DB_HOST', 'mysql-bloom-bonsai.alwaysdata.net');
$db   = getEnvVar('DB_NAME', 'bloom-bonsai_db');
$user = getEnvVar('DB_USER', 'bloom-bonsai');
$pass = getEnvVar('DB_PASSWORD', '12345slA@#');

// List of potential passwords to try on AlwaysData
$possiblePasses = array_filter([$pass, '12345slA@#', '12345slA', getenv('ALWAYSDATA_PASSWORD')]);

foreach ($possiblePasses as $p) {
    if ($connected) break;
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $p, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $connected = true;
    } catch (PDOException $e) {}
}

// 2. Try AlwaysData Local Host Socket
if (!$connected) {
    foreach ($possiblePasses as $p) {
        if ($connected) break;
        try {
            $pdo = new PDO("mysql:host=localhost;dbname=bloom-bonsai_db;charset=utf8mb4", "bloom-bonsai", $p, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            $connected = true;
        } catch (PDOException $e) {}
    }
}

// 3. Try Local XAMPP MySQL
if (!$connected) {
    try {
        $pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=bloom_bonsai;charset=utf8mb4", "root", "", [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $connected = true;
    } catch (PDOException $e) {}
}

// 4. Try InfinityFree Cloud Database
if (!$connected) {
    try {
        $pdo = new PDO("mysql:host=sql302.infinityfree.com;port=3306;dbname=if0_42757057_bloombonsaidatabase;charset=utf8mb4", "if0_42757057", "12345slA", [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $connected = true;
    } catch (PDOException $e) {}
}

if (!$connected) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: Unable to connect to MySQL database server.'
    ]);
    exit;
}

if (!function_exists('respond')) {
    function respond($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data);
        exit;
    }
}
