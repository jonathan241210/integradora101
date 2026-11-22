<?php

namespace Tests\Feature\Staff;

use App\Models\StaffNotification;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\FeatureTestCase;

class CreateStaffCommandTest extends FeatureTestCase
{
    private const REASON_PROMPT = 'Motivo del cambio (mínimo 10 caracteres)';

    private const CONFIRM_PROMPT = '¿Aplicar el cambio?';

    private const PASSWORD = 'SafePassphrase12!';

    private const AREAS = ['Dirección', 'Informática', 'Presidencia', 'Servicios veterinarios', 'Taquilla'];

    /** Opciones del selector de rol: código => etiqueta; la del rol sugerido lleva la marca de sugerencia. */
    private function roleOptions(?string $suggested): array
    {
        $labels = [
            'zoo-admin' => 'Administrador del Zoológico',
            'executive' => 'Consulta directiva',
            'communications' => 'Comunicación',
            'cashier' => 'Cajero',
            'veterinarian' => 'Veterinario',
        ];
        $options = [];
        foreach ($labels as $code => $label) {
            $options[$code] = $code.' — '.$label.($code === $suggested ? ' (sugerido por área)' : '');
        }

        return $options;
    }

    private function prepare(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        Http::fake(['api.pwnedpasswords.com/range/*' => Http::response('', 200)]);
    }

    /** CA-14 staff-authentication y CA-24 / CA-33 api-023 */
    public function test_ca14_staff_authentication_interactive_command_creates_an_account_with_suggested_role(): void
    {
        $this->prepare();
        $email = 'staff-'.bin2hex(random_bytes(8)).'@test.arca.invalid';
        $notices = StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->count();

        $this->artisan('arca:create-staff')
            ->expectsQuestion(self::REASON_PROMPT, 'Alta de personal solicitada por Dirección')
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Alicia')
            ->expectsQuestion('Primer apellido', 'Prueba')
            ->expectsQuestion('Segundo apellido', 'Personal')
            ->expectsChoice('Área', 'Dirección', self::AREAS)
            ->expectsChoice('Rol (elige uno)', 'zoo-admin', $this->roleOptions('zoo-admin'))
            ->expectsQuestion('Contraseña', self::PASSWORD)
            ->expectsQuestion('Confirma la contraseña', self::PASSWORD)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')
            ->assertExitCode(0);

        $user = User::query()->where('first_name', 'Alicia')->where('email', $email)->firstOrFail();

        $this->assertSame(['zoo-admin'], $user->getRoleNames()->all());
        $this->assertSame('management', $user->department->code);
        $this->assertTrue(password_verify(self::PASSWORD, $user->password));
        $this->assertGreaterThan($notices, StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->count());
    }

    /** CA-24 api-023: la lista de roles no incluye `admin` y no hay un valor por defecto que conceda acceso. */
    public function test_ca24_role_list_excludes_admin_and_has_no_granting_default(): void
    {
        $this->prepare();
        $email = 'staff-'.bin2hex(random_bytes(8)).'@test.arca.invalid';

        $this->assertNotContains('admin', array_keys($this->roleOptions(null)));

        $this->artisan('arca:create-staff')
            ->expectsQuestion(self::REASON_PROMPT, 'Alta de personal solicitada por Presidencia')
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Beto')
            ->expectsQuestion('Primer apellido', 'Prueba')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsChoice('Área', 'Presidencia', self::AREAS)
            // Presidencia sugiere `executive`, pero solo en la etiqueta; la lista no trae `admin`.
            ->expectsChoice('Rol (elige uno)', 'cashier', $this->roleOptions('executive'))
            ->expectsQuestion('Contraseña', self::PASSWORD)
            ->expectsQuestion('Confirma la contraseña', self::PASSWORD)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')
            ->assertExitCode(0);

        $this->assertSame(['cashier'], User::query()->where('email', $email)->firstOrFail()->getRoleNames()->all());

        // Sin valor por defecto: el código del comando no declara `default:` en el selector de rol.
        $source = file_get_contents(app_path('Console/Commands/CreateStaffCommand.php'));
        $this->assertStringNotContainsString('default: $suggestedRole', $source);
    }

    /** CA-32 api-023 */
    public function test_ca32_create_staff_simple_is_retired(): void
    {
        $this->assertArrayNotHasKey('arca:create-staff-simple', Artisan::all());
        $this->assertArrayHasKey('arca:create-staff', Artisan::all());
    }

    /** CA-33 api-023 */
    public function test_ca33_create_staff_requires_reason_confirmation_audit_and_notices(): void
    {
        $this->prepare();
        $email = 'staff-'.bin2hex(random_bytes(8)).'@test.arca.invalid';
        $before = User::query()->count();

        // Sin motivo válido no cambia nada.
        $this->artisan('arca:create-staff')
            ->expectsQuestion(self::REASON_PROMPT, 'corto')
            ->expectsOutputToContain('Indica el motivo del cambio.')
            ->assertExitCode(1);
        $this->assertSame($before, User::query()->count());

        // Confirmación rechazada: sin cuenta ni auditoría.
        $audit = DB::table('activity_log')->where('event', 'console-created')->count();
        $this->artisan('arca:create-staff')
            ->expectsQuestion(self::REASON_PROMPT, 'Alta de personal solicitada por Dirección')
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Carla')
            ->expectsQuestion('Primer apellido', 'Prueba')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsChoice('Área', 'Taquilla', self::AREAS)
            ->expectsChoice('Rol (elige uno)', 'cashier', $this->roleOptions('cashier'))
            ->expectsQuestion('Contraseña', self::PASSWORD)
            ->expectsQuestion('Confirma la contraseña', self::PASSWORD)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'no')
            ->assertExitCode(0);
        $this->assertFalse(User::query()->where('email', $email)->exists());
        $this->assertSame($audit, DB::table('activity_log')->where('event', 'console-created')->count());

        // Confirmada: cuenta, auditoría sin causante y avisos a los administradores activos.
        $this->artisan('arca:create-staff')
            ->expectsQuestion(self::REASON_PROMPT, 'Alta de personal solicitada por Dirección')
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Carla')
            ->expectsQuestion('Primer apellido', 'Prueba')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsChoice('Área', 'Taquilla', self::AREAS)
            ->expectsChoice('Rol (elige uno)', 'cashier', $this->roleOptions('cashier'))
            ->expectsQuestion('Contraseña', self::PASSWORD)
            ->expectsQuestion('Confirma la contraseña', self::PASSWORD)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')
            ->assertExitCode(0);

        $user = User::query()->where('email', $email)->firstOrFail();
        $row = DB::table('activity_log')->where('event', 'console-created')->where('subject_id', $user->id)->first();
        $this->assertNotNull($row);
        $this->assertNull($row->causer_id);
        $this->assertSame('consola', json_decode($row->properties, true)['origin']);
        $this->assertStringNotContainsString(self::PASSWORD, $row->properties);

        $activeAdmins = User::query()->role('admin')->where('is_active', true)->pluck('users.id')->all();
        $notified = StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)
            ->get()->filter(fn ($n) => ($n->payload['account_email'] ?? null) === $email)->pluck('user_id')->all();
        $this->assertEqualsCanonicalizing($activeAdmins, $notified);
        $this->assertNotContains($user->id, $notified);

        // Sin terminal no se ejecuta (pide la contraseña).
        $this->artisan('arca:create-staff', ['--no-interaction' => true, '--reason' => 'Motivo suficientemente largo', '--yes' => true])
            ->expectsOutputToContain('Este comando pide la contraseña en la terminal.')->assertExitCode(1);
    }
}
