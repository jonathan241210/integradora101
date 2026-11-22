<?php

namespace Tests\Feature\Admin;

use App\Models\CancellationReview;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Spatie\Permission\PermissionRegistrar;

/** api-027: clave `cancellation_days` de pending-counts (api-024). */
class PendingReviewCountsCancellationTest extends CancellationReviewTestCase
{
    private const COUNTS = '/api/v1/admin/pending-counts';

    private function review(User $admin, User $cashier, string $date, string $status): void
    {
        CancellationReview::query()->create([
            'cashier_id' => $cashier->id, 'business_date' => $date, 'status' => $status,
            'note' => 'Nota de revisión de prueba.', 'reviewed_by' => $admin->id,
        ]);
    }

    /** @param  list<string>  $permissions */
    private function staffWith(array $permissions): User
    {
        $user = $this->createAccount('executive');
        $user->syncRoles([]);
        $user->givePermissionTo($permissions);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user;
    }

    /** CA-23 cancellation-review-signals */
    public function test_ca23_cancellation_days_counts_attention_without_review(): void
    {
        // «Hoy» es el 2019-03-12 a las 12:00 locales: los 7 días cerrados son del 03-05 al 03-11.
        $now = CarbonImmutable::parse('2019-03-12 18:00:00', 'UTC');
        CarbonImmutable::setTestNow($now);
        Carbon::setTestNow($now);

        $admin = $this->createAccount('admin');
        $laura = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $beto = $this->createAccount('cashier', true, ['first_name' => 'Beto']);
        $this->wipe();

        $this->attentionDay($laura, '2019-03-04'); // 8 días atrás: fuera del periodo
        $this->attentionDay($laura, '2019-03-06'); // sin revisión: cuenta
        $this->attentionDay($laura, '2019-03-07'); // revisado en orden: no cuenta
        $this->attentionDay($laura, '2019-03-08'); // requiere aclaración: cuenta
        $this->reviewDay($beto, '2019-03-09'); // Revisar: no entra en el aviso
        $this->attentionDay($laura, '2019-03-10'); // aclaración y luego en orden: la vigente lo cierra
        $this->attentionDay($beto, '2019-03-12'); // hoy: no cuenta
        $this->review($admin, $laura, '2019-03-07', 'reviewed_ok');
        $this->review($admin, $laura, '2019-03-08', 'clarification_required');
        $this->review($admin, $laura, '2019-03-10', 'clarification_required');
        $this->review($admin, $laura, '2019-03-10', 'reviewed_ok');

        $this->assertSame(['cancellation_days' => 2], $this->actAs($admin)->getJson(self::COUNTS)->assertOk()->json());

        // Cerrar el 03-06 con «Todo en orden» baja el aviso; la aclaración nueva de otro día lo sube.
        $this->review($admin, $laura, '2019-03-06', 'reviewed_ok');
        $this->assertSame(1, $this->actAs($admin)->getJson(self::COUNTS)->json('cancellation_days'));
        $this->review($admin, $laura, '2019-03-10', 'clarification_required');
        $this->assertSame(2, $this->actAs($admin)->getJson(self::COUNTS)->json('cancellation_days'));
    }

    /** CA-24 cancellation-review-signals */
    public function test_ca24_pending_counts_keys_follow_each_permission(): void
    {
        $admin = $this->createAccount('admin');
        $this->assertSame(['cancellation_days'], array_keys($this->actAs($admin)->getJson(self::COUNTS)->assertOk()->json()));

        foreach (['species.review' => 'species_requests', 'memories.review' => 'memories'] as $permission => $key) {
            $json = $this->actAs($this->staffWith([$permission]))->getJson(self::COUNTS)->assertOk()->json();
            $this->assertSame([$key], array_keys($json));
            $this->assertArrayNotHasKey('cancellation_days', $json);
        }

        $all = $this->actAs($this->staffWith(['species.review', 'memories.review', 'reports.cancellations.view']))->getJson(self::COUNTS)->assertOk()->json();
        $this->assertEqualsCanonicalizing(['species_requests', 'memories', 'cancellation_days'], array_keys($all));

        $none = $this->actAs($this->createAccount('cashier'))->getJson(self::COUNTS)->assertForbidden();
        $this->assertArrayNotHasKey('cancellation_days', $none->json() ?? []);
    }
}
