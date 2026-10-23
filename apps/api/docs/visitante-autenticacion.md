# Autenticación del visitante

Contrato de `api-004`. La app móvil consume estos endpoints solo cuando `EXPO_PUBLIC_API_URL` tiene valor; sin esa variable sigue la cuenta simulada. Los pasos para arrancarla en cada máquina están en el README de `apps/mobile`. No hay secretos en este documento.

## Sesión

El personal entra con cookie en `/api/v1/auth/*`. El visitante entra con Bearer en `/api/v1/visitor/*`. El token de acceso dura 15 minutos, lleva la ability `visitor` y el modelo es `Visitor`. El refresh es opaco, dura 30 días y en la base solo se guarda su hash SHA-256. Cada uso rota el par. Reusar un refresh ya gastado revoca esa familia.

Un token de visitante no entra a `GET /api/v1/auth/me`. Una sesión de personal no entra a las rutas del visitante.

## Rutas

| Método y ruta | Auth | Resultado |
|---|---|---|
| `GET /api/v1/visitor/legal/privacy-notice` | Pública | `version` y `content` del aviso vigente |
| `POST /api/v1/visitor/auth/register` | Pública | 201 sin tokens. El código de 6 dígitos sale por correo |
| `POST /api/v1/visitor/auth/email/verify` | Pública | 200 con el par de tokens, o 422 si el código no sirve |
| `POST /api/v1/visitor/auth/email/resend` | Pública | 202 genérico. 1 por minuto y 5 por hora |
| `POST /api/v1/visitor/auth/login` | Pública | Par de tokens. 403 `email_not_verified` si falta confirmar el correo |
| `POST /api/v1/visitor/auth/refresh` | El refresh | Par nuevo, o 401 si la sesión ya no es válida |
| `POST /api/v1/visitor/auth/logout` | Bearer | 204. Revoca el dispositivo |
| `POST /api/v1/visitor/auth/password/forgot` | Pública | 202 genérico. 3 por hora |
| `POST /api/v1/visitor/auth/password/reset` | Pública | Cambia la contraseña y revoca todos los tokens |
| `GET /api/v1/visitor/me` | Bearer | Correo, nombre, apodo y avatar |
| `PATCH /api/v1/visitor/me` | Bearer | Actualiza nombre, apodo y avatar |
| `PUT /api/v1/visitor/me/password` | Bearer | Cambia la contraseña y conserva esta sesión |
| `DELETE /api/v1/visitor/me` | Bearer | 204. Borrado físico si la contraseña es correcta |

La contraseña del visitante pide 8 caracteres, letras y números. La del personal no cambia. El correo usa `MAIL_MAILER` del `.env`; en desarrollo el ejemplo deja `log`. El aviso provisional es la versión `2026-10` hasta que el zoológico entregue el texto definitivo.

Los límites responden 429 con «Espera N segundos e inténtalo de nuevo.»

## Progreso

`api-005` añade, con el mismo Bearer `visitor`, el alta `POST /api/v1/visitor/discoveries` y las lecturas `progress`, `collection`, `achievements` y `missions`. El servidor calcula puntos, nivel, rango, logros y misiones. Un `client_scan_id` repetido no suma puntos. Más de 30 escaneos nuevos en un minuto responde 429. El comando `php artisan arca:generate-qr-codes {recinto}` solo imprime en consola un código opaco; no imprime el QR.
