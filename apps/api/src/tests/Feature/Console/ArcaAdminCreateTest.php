<?php

namespace Tests\Feature\Console;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ArcaAdminCreateTest extends ConsoleAdminTestCase
{
    /** CA-21 api-023 */
    public function test_ca21_create_makes_active_admin_without_two_factor(): void
    {
        $this->seedRoles();
        $this->primary();
        $department = Department::query()->where('is_active', true)->orderBy('name')->firstOrFail();
        $choices = Department::query()->where('is_active', true)->orderBy('name')->pluck('name')->all();
        $password = 'SafePassphrase12!';
        $email = 'admin-'.bin2hex(random_bytes(6)).'@test.arca.invalid';
        $before = $this->snapshot();

        $this->artisan('arca:admin:create')
            ->expectsQuestion(self::REASON_PROMPT, self::REASON)
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Alicia')
            ->expectsQuestion('Primer apellido', 'Consola')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsChoice('Área', $department->name, $choices)
            ->expectsQuestion('Contraseña', $password)
            ->expectsQuestion('Confirma la contraseña', $password)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')
            ->assertExitCode(0);

        $user = User::query()->where('email', $email)->firstOrFail();
        $this->assertSame(['admin'], $user->getRoleNames()->all());
        $this->assertTrue((bool) $user->is_active);
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertNull($user->created_by);
        $this->assertStringStartsWith('$2y$', $user->password);
        $this->assertSame($before[0] + 1, $this->consoleActivityCount());

        Auth::forgetGuards();
        $this->actingAs($user, 'web')->getJson('/api/v1/auth/me')
            ->assertOk()->assertJsonPath('data.two_factor_setup_required', true);
    }

    /** CA-17 api-023: rechazar la confirmación no crea la cuenta. */
    public function test_ca21_create_rejected_confirmation_makes_no_account(): void
    {
        $this->seedRoles();
        $this->primary();
        $department = Department::query()->where('is_active', true)->orderBy('name')->firstOrFail();
        $choices = Department::query()->where('is_active', true)->orderBy('name')->pluck('name')->all();
        $email = 'admin-'.bin2hex(random_bytes(6)).'@test.arca.invalid';

        $this->artisan('arca:admin:create')
            ->expectsQuestion(self::REASON_PROMPT, self::REASON)
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Alicia')
            ->expectsQuestion('Primer apellido', 'Consola')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsChoice('Área', $department->name, $choices)
            ->expectsQuestion('Contraseña', 'SafePassphrase12!')
            ->expectsQuestion('Confirma la contraseña', 'SafePassphrase12!')
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'no')
            ->assertExitCode(0);

        $this->assertFalse(User::query()->where('email', $email)->exists());
    }

    /** CA-21 api-023: correo y nombres demasiado largos se rechazan con un mensaje claro y no crean nada. */
    public function test_ca21_create_rejects_values_over_the_column_limits(): void
    {
        $this->seedRoles();
        $this->primary();
        $before = $this->snapshot();
        $users = DB::table('users')->count();
        $email = 'admin-'.bin2hex(random_bytes(6)).'@test.arca.invalid';

        $this->artisan('arca:admin:create')
            ->expectsQuestion(self::REASON_PROMPT, self::REASON)
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', str_repeat('N', 101))
            ->expectsQuestion('Primer apellido', 'Consola')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsOutputToContain('máximo 255 caracteres y cada nombre o apellido, máximo 100')
            ->assertExitCode(1);

        $this->assertSame($users, DB::table('users')->count());
        $this->assertSame($before, $this->snapshot());
    }
}
