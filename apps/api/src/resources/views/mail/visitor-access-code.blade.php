@if ($purpose === 'registration_notice')
<p>Alguien intentó crear una cuenta con este correo. Si fuiste tú, escribe el código en la app. Si no, ignóralo.</p>
@endif
<p>Tu código es {{ $code }}. Vence en 15 minutos y solo puede usarse una vez.</p>
