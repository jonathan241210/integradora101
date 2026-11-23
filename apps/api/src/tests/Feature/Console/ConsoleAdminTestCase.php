<?php

namespace Tests\Feature\Console;

use App\Models\StaffNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

/**
 * Base de las pruebas de `arca:admin:*` (api-023). DatabaseTransactions sobre arca_pruebas.
 */
abstract class ConsoleAdminTestCase extends FeatureTestCase
{
    use CreatesAdministrators;

    protected const REASON = 'Cambio solicitado por Presidencia';

    protected const REASON_PROMPT = 'Motivo del cambio (mínimo 10 caracteres)';

    protected const CONFIRM_PROMPT = '¿Aplicar el cambio?';

    protected const PRIMARY_PROMPT = 'Contraseña del administrador titular';

    /** Contraseña de las cuentas de `createAccount`. */
    protected const PRIMARY_PASSWORD = 'SafePassphrase12!';

    protected function setUp(): void
    {
        parent::setUp();

        Http::fake(['api.pwnedpasswords.com/range/*' => Http::response('', 200)]);
    }

    /** Crea el admin titular (activo) y lo configura en `arca.primary_admin_email`. */
    protected function primary(): User
    {
        $primary = $this->createAccount('admin');
        config(['arca.primary_admin_email' => $primary->email]);

        return $primary;
    }

    /** Opciones para ejecutar sin terminal con motivo y confirmación. */
    protected function unattended(array $extra = []): array
    {
        return array_merge(['--reason' => self::REASON, '--yes' => true, '--no-interaction' => true], $extra);
    }

    protected function consoleActivityCount(): int
    {
        return DB::table('activity_log')->where('log_name', 'admin')->where('event', 'like', 'console-%')->count();
    }

    protected function consoleNoticeCount(): int
    {
        return StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->count();
    }

    /** @return array{int, int} actividad y avisos de consola, para comprobar que no cambiaron */
    protected function snapshot(): array
    {
        return [$this->consoleActivityCount(), $this->consoleNoticeCount()];
    }

    protected function insertSession(User $user): string
    {
        $id = bin2hex(random_bytes(20));
        DB::table('sessions')->insert([
            'id' => $id, 'user_id' => $user->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit', 'payload' => '', 'last_activity' => time(),
        ]);

        return $id;
    }

    /** Deja un único administrador activo (el indicado); el resto queda inactivo dentro de la transacción de la prueba. */
    protected function onlyActiveAdmin(User $keep): void
    {
        User::query()->role('admin')->whereKeyNot($keep->id)->update(['is_active' => false]);
    }
}
