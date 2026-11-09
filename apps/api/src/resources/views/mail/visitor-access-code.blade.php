<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Código de acceso · ARCA-NB</title>
</head>
<body>
    <h2>Zoológico Municipal Nicolás Bravo · ARCA-NB</h2>
    @if ($purpose === 'password_reset')
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de visitante.</p>
    @elseif ($purpose === 'registration_notice')
        <p>Alguien intentó crear una cuenta con este correo. Si fuiste tú, escribe el código en la app. Si no, ignóralo.</p>
    @else
        <p>Gracias por crear tu cuenta de visitante. Confirma tu correo electrónico con el siguiente código de 6 dígitos:</p>
    @endif
    <p><strong>Tu código es {{ $code }}</strong></p>
    <p>Vence en 15 minutos y solo puede usarse una vez. Si no solicitaste este código, puedes ignorar este mensaje.</p>
</body>
</html>
