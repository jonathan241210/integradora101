<?php

return [
    /*
    | Días que una petición aceptada se muestra en el portal (api-010 RN-21, CA-30).
    | Se deja el valor crudo: ComputePublicationWindowAction valida que sea un entero >= 1.
    */
    'publication_days' => env('MEMORIES_PUBLICATION_DAYS', 7),

    /* Versión de los términos aceptados en cada envío o reenvío (api-010 RN-23). */
    'terms_version' => env('MEMORIES_TERMS_VERSION', 'v1'),
];
