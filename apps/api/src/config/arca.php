<?php

return [
    'pwa_url' => env('PWA_URL'),
    'two_factor_roles' => ['admin', 'zoo-admin'],
    'demo_staff_password' => env('DEMO_STAFF_PASSWORD'),
    'staff_users_per_minute' => env('STAFF_USERS_PER_MINUTE', 60),
];
