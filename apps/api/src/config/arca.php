<?php

return [
    'pwa_url' => env('PWA_URL'),
    'two_factor_roles' => ['admin', 'zoo-admin'],
    'demo_staff_password' => env('DEMO_STAFF_PASSWORD'),
    'report_export_formats' => ['csv', 'xlsx', 'pdf'],
    'report_pdf_max_tickets' => 2000,
    'report_timezone' => 'America/Mexico_City',
    'report_max_days' => 366,
    'report_page_size' => 50,
    // Máximo de boletos (adultos + niños) por venta (api-009 CA-42, RN-29). Cambiarlo requiere desplegar.
    'ticket_sale_max_tickets' => 50,
];
