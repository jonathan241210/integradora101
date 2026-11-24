<?php

return [

    /*
    | PUSH_ENABLED=false marca el despacho como enviado sin llamar a Expo.
    | Sirve en desarrollo para que la cola no se atasque. Los tests inyectan
    | el doble y no dependen de esta bandera.
    */
    'enabled' => filter_var(env('PUSH_ENABLED', false), FILTER_VALIDATE_BOOL),

    'url' => env('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send'),

    'access_token' => env('EXPO_ACCESS_TOKEN', ''),

    /*
     | Ruta absoluta a un cacert.pem. En Windows PHP suele ir sin curl.cainfo
     | y el POST a Expo falla con cURL 60. Vacío: usa el almacén de PHP.
     */
    'ca_bundle' => env('PUSH_CA_BUNDLE', ''),

];
