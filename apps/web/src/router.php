<?php

declare(strict_types=1);

$documentRoot = realpath(__DIR__);
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestPath = parse_url($requestUri, PHP_URL_PATH);
$decodedPath = is_string($requestPath) ? rawurldecode($requestPath) : '/';
$candidate = false;

if ($documentRoot !== false && !str_contains($decodedPath, "\0")) {
    $relativePath = ltrim(str_replace('\\', '/', $decodedPath), '/');
    $candidate = realpath($documentRoot.DIRECTORY_SEPARATOR.$relativePath);
}

$isInsideDocumentRoot = $candidate !== false
    && $documentRoot !== false
    && ($candidate === $documentRoot || str_starts_with($candidate, $documentRoot.DIRECTORY_SEPARATOR));

if ($isInsideDocumentRoot && (is_file($candidate) || is_dir($candidate))) {
    return false;
}

http_response_code(404);
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

$notFoundPage = __DIR__.DIRECTORY_SEPARATOR.'404.html';

if (is_readable($notFoundPage)) {
    readfile($notFoundPage);
    return true;
}

echo '<!DOCTYPE html><html lang="es"><meta charset="UTF-8"><title>Página no encontrada</title><h1>404 · Página no encontrada</h1></html>';

return true;
