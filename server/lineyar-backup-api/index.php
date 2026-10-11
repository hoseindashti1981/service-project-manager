<?php
declare(strict_types=1);

function respond(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

header("Content-Security-Policy: default-src 'none'");
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$configFile = dirname(__DIR__, 2) . '/lineyar-backup-config.php';
if (!is_file($configFile)) respond(503, ['error' => 'تنظیمات سرور بکاپ کامل نشده است.']);
$config = require $configFile;
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $config['allowed_origins'] ?? [], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
} elseif ($origin !== '') respond(403, ['error' => 'مبدأ درخواست مجاز نیست.']);
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') respond(204, []);
if (($_GET['health'] ?? '') === '1') respond(200, ['ok' => true]);

$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($authorization === '' && function_exists('getallheaders')) {
    $headers = getallheaders();
    $authorization = is_array($headers) ? (string)($headers['Authorization'] ?? $headers['authorization'] ?? '') : '';
}
if (!preg_match('/^Bearer ([A-Za-z0-9_-]{43})$/', $authorization, $match) || !hash_equals((string)($config['access_hash'] ?? ''), hash('sha256', $match[1]))) respond(401, ['error' => 'کد اتصال معتبر نیست.']);
$storage = (string)($config['storage_dir'] ?? '');
if ($storage === '' || (!is_dir($storage) && !mkdir($storage, 0700, true))) respond(500, ['error' => 'فضای بکاپ در دسترس نیست.']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $maxBytes = (int)($config['max_bytes'] ?? 5242880);
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length < 1 || $length > $maxBytes) respond(413, ['error' => 'حجم بکاپ مجاز نیست.']);
    $raw = file_get_contents('php://input');
    $value = is_string($raw) ? json_decode($raw, true) : null;
    $backup = $value['backup'] ?? null;
    if (!is_array($value) || !is_string($value['exportedAt'] ?? null) || !is_array($backup) || ($backup['format'] ?? '') !== 'lineyar-cloud-backup' || ($backup['version'] ?? 0) !== 1 || !preg_match('/^[A-Za-z0-9_-]{16}$/', (string)($backup['iv'] ?? '')) || !preg_match('/^[A-Za-z0-9_-]+$/', (string)($backup['ciphertext'] ?? ''))) respond(422, ['error' => 'ساختار بکاپ معتبر نیست.']);
    $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6));
    $target = $storage . DIRECTORY_SEPARATOR . $id . '.json';
    $temporary = $target . '.tmp';
    $stored = json_encode(['id'=>$id,'createdAt'=>gmdate(DATE_ATOM),'exportedAt'=>$value['exportedAt'],'backup'=>$backup], JSON_UNESCAPED_SLASHES);
    if (file_put_contents($temporary, $stored, LOCK_EX) === false || !rename($temporary, $target)) { @unlink($temporary); respond(500, ['error' => 'ذخیره بکاپ انجام نشد.']); }
    @chmod($target, 0600);
    $files = glob($storage . DIRECTORY_SEPARATOR . '*.json') ?: [];
    usort($files, fn(string $a, string $b): int => filemtime($b) <=> filemtime($a));
    foreach (array_slice($files, max(1, (int)($config['keep'] ?? 10))) as $file) @unlink($file);
    respond(201, ['ok'=>true,'id'=>$id]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, ['error' => 'روش درخواست پشتیبانی نمی‌شود.']);
$id = (string)($_GET['id'] ?? '');
if ($id !== '') {
    if (!preg_match('/^\d{8}-\d{6}-[a-f0-9]{12}$/', $id)) respond(400, ['error' => 'شناسه بکاپ معتبر نیست.']);
    $file = $storage . DIRECTORY_SEPARATOR . $id . '.json';
    if (!is_file($file)) respond(404, ['error' => 'نسخه بکاپ پیدا نشد.']);
    $value = json_decode((string)file_get_contents($file), true);
    respond(200, ['backup'=>$value['backup'] ?? null]);
}
$items = [];
foreach (glob($storage . DIRECTORY_SEPARATOR . '*.json') ?: [] as $file) {
    $value = json_decode((string)file_get_contents($file), true);
    if (is_array($value)) $items[]=['id'=>$value['id'],'createdAt'=>$value['createdAt'],'exportedAt'=>$value['exportedAt'],'bytes'=>filesize($file)];
}
usort($items, fn(array $a, array $b): int => strcmp($b['createdAt'], $a['createdAt']));
respond(200, ['items'=>$items]);
