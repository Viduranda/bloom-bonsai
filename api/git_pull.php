<?php
// Helper endpoint to pull latest changes from GitHub repository on AlwaysData
header('Content-Type: application/json; charset=utf-8');

$repoDir = dirname(__DIR__);
chdir($repoDir);

$output = [];
$returnVar = -1;

if (function_exists('exec')) {
    @exec('git fetch origin main && git reset --hard origin/main 2>&1', $output, $returnVar);
} elseif (function_exists('shell_exec')) {
    $outStr = @shell_exec('git fetch origin main && git reset --hard origin/main 2>&1');
    if ($outStr) $output = explode("\n", $outStr);
}

echo json_encode([
    'success' => $returnVar === 0 || !empty($output),
    'output' => $output,
    'time' => date('Y-m-d H:i:s')
]);
