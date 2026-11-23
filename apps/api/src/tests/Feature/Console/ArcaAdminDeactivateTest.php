<?php

namespace Tests\Feature\Console;

use App\Actions\Admin\Users\GuardAdministratorContinuityAction;
use App\Models\StaffNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ArcaAdminDeactivateTest extends ConsoleAdminTestCase
{
    /**
     * CA-20 api-023 (revisión 2026-11-21): la última cuenta admin activa es el titular, así que el comando la protege
     * con el mensaje del titular; la regla de continuidad sigue en `GuardAdministratorContinuityAction`.
     */
    public function test_ca20_last_active_admin_cannot_be_deactivated(): void
    {
        $last = $this->primary();
        $this->onlyActiveAdmin($last);
        $before = $this->snapshot();

        $this->artisan('arca:admin:deactivate', ['email' => $last->email] + $this->unattended())
            ->expectsOutputToContain('Primero cambia ARCA_PRIMARY_ADMIN_EMAIL a otro administrador.')
            ->assertExitCode(1);

        $this->assertTrue((bool) $last->fresh()->is_active);
        $this->assertSame($before, $this->snapshot());

        try {
            DB::transaction(fn () => app(GuardAdministratorContinuityAction::class)->ensureAnotherActiveAdmin($last));
            $this->fail('Debió rechazar la última cuenta admin activa.');
        } catch (ValidationException $e) {
            $this->assertSame('Debe existir al menos un administrador de Presidencia activo.', $e->validator->errors()->first());
        }

        // Con dos administradores activos desactiva (no titular) e invalida sesiones; el desactivado no recibe aviso (Q2).
        $second = $this->createAccount('admin');
        $session = $this->insertSession($second);

        $this->artisan('arca:admin:deactivate', ['email' => $second->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);

        $this->assertFalse((bool) $second->fresh()->is_active);
        $this->assertFalse(DB::table('sessions')->where('id', $session)->exists());
        $this->assertSame(1, StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->where('user_id', $last->id)->count());
        $this->assertSame(0, StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->where('user_id', $second->id)->count());
    }
}
