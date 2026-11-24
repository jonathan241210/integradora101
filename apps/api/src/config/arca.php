<?php

// Umbrales del reporte de cancelaciones (api-022 RN-08, CA-25; revisión 2026-11-21 c). `cancel_after_minutes` marca la
// «cancelación tardía» de cada boleto y alimenta S5; `cashier_cancel_percent` alimenta S1 del semáforo. Nunca bloquean.
// `cashier_min_sold_tickets` se retiró: las alertas por cajero y periodo las sustituye el semáforo.
$cancellationAlerts = [
    'cancel_after_minutes' => 30,
    'cashier_cancel_percent' => 10,
];

return [
    'pwa_url' => env('PWA_URL'),
    // api-028 CA-06: peticiones por minuto y usuario en /staff/*. La PWA sincroniza por lotes, 120 sobra.
    'staff_api_limit' => (int) env('STAFF_API_LIMIT', 120),
    // api-028 CA-11: proxies de confianza (IP o CIDR separados por coma, o `*`). Vacío: ninguno.
    'trusted_proxies' => env('TRUSTED_PROXIES'),
    // Roles con 2FA obligatorio (api-021 RN-09, api-023 RN-05). `veterinarian` no usa 2FA (trabajo de campo offline).
    'two_factor_roles' => ['admin', 'zoo-admin', 'cashier', 'executive', 'communications'],
    // Confirmación de contraseña por operación (api-021 RN-03, RN-07). Sin variables de entorno.
    'password_confirmation' => [
        'window_minutes' => 10,
        'max_attempts' => 5,
        'attempts_window_minutes' => 10,
        'lockout_minutes' => 10,
    ],
    // Consola de administradores (api-023, revisión 2026-11-21). Correo del admin titular: su contraseña autoriza los
    // comandos `arca:admin:*` de nivel alto. Vacío o inactivo = esos comandos fallan.
    'primary_admin_email' => env('ARCA_PRIMARY_ADMIN_EMAIL'),
    // Modo recuperación: permite restablecer la contraseña del titular sin su contraseña. Debe estar en false.
    'admin_recovery' => (bool) env('ARCA_ADMIN_RECOVERY', false),
    'demo_staff_password' => env('DEMO_STAFF_PASSWORD'),
    'report_export_formats' => ['csv', 'xlsx', 'pdf'],
    'report_pdf_max_tickets' => 2000,
    // Zona horaria única de negocio (api-025 RN-01): día de panel, reportes, cancelación y vigencia pública.
    // Los instantes siguen en UTC (app.timezone no cambia). Se lee solo mediante App\Support\BusinessTimezone.
    'timezone' => env('ARCA_TIMEZONE', 'America/Mexico_City'),
    'report_max_days' => 366,
    'cancellation_alerts' => $cancellationAlerts,
    // Semáforo de cancelaciones por cajero y día (api-027 RN-04, RN-05). Solo configuración del servidor; no se edita
    // desde el panel. S1 y S5 reutilizan los umbrales de `cancellation_alerts`. Nunca bloquea nada.
    'cancellation_review' => [
        'over_limit_percent' => $cancellationAlerts['cashier_cancel_percent'],
        'daily_min_sold_tickets' => 10,
        'late_window_minutes' => 30,
        'late_min_count' => 2,
        'repeated_other_min' => 2,
        'same_amount_min' => 2,
        // Copia de `cancellation_alerts.cancel_after_minutes` hecha al CARGAR la configuración: cambiar solo
        // `arca.cancellation_alerts.cancel_after_minutes` en tiempo de ejecución (p. ej. en un test) no la actualiza.
        'long_cancel_minutes' => $cancellationAlerts['cancel_after_minutes'],
        'long_cancel_min_count' => 2,
        'baseline_weeks' => 4,
        'baseline_min_active_days' => 3,
        'baseline_multiplier' => 2,
        'peer_window_days' => 7,
        'peer_min_cashiers' => 2,
        'peer_min_sold_tickets' => 10,
        'comparison_min_percent' => 5,
        'comparison_min_cancelled' => 2,
        'attention_min_signals' => 2,
        // Días de negocio cerrados que cuenta el aviso de `pending-counts` (RN-11).
        'pending_days' => 7,
    ],
    'report_page_size' => 50,
    // Máximo de boletos (adultos + niños) por venta (api-009 CA-42, RN-29). Cambiarlo requiere desplegar.
    'ticket_sale_max_tickets' => 50,
];
