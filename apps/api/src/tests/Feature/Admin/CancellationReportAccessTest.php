<?php

namespace Tests\Feature\Admin;

class CancellationReportAccessTest extends CancellationReportTestCase
{
    /** CA-01 ticket-cancellation-report */
    public function test_ca01_admin_with_permission_and_two_factor_gets_report_shape(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $this->cancelledSale($cashier, '2033-03-08 16:00:00');

        $data = $this->report($admin);

        $this->assertSame(['period', 'totals', 'reconciliation', 'rows', 'legend', 'levels', 'disclaimer'], array_keys($data));
        $this->assertSame(['type', 'from', 'to', 'label', 'previous_date', 'next_date', 'timezone'], array_keys($data['period']));
        $this->assertSame('America/Mexico_City', $data['period']['timezone']);
        $this->assertSame(['cancelled_tickets', 'cancelled_amount', 'by_cashier', 'by_reason'], array_keys($data['totals']));
        $this->assertSame(['days', 'cashiers', 'cashier_days'], array_keys($data['reconciliation']));
        $this->assertSame(
            ['folio', 'adult_quantity', 'child_quantity', 'total_amount', 'purchased_at', 'cancelled_at', 'cashier_name', 'cancelled_by_name', 'reason_code', 'reason_label', 'comment', 'minutes_to_cancel', 'late_cancellation', 'signal_codes'],
            array_keys($data['rows'][0]),
        );
        $this->assertSame(
            ['date', 'gross', 'cancelled', 'net', 'balanced'],
            array_keys($data['reconciliation']['days'][0]),
        );
        $this->assertSame(
            ['cashier_id', 'cashier_name', 'gross', 'cancelled', 'net', 'balanced', 'active_days', 'sold_tickets', 'cancel_percent', 'days_to_review'],
            array_keys($data['reconciliation']['cashiers'][0]),
        );
    }

    /** CA-02 ticket-cancellation-report */
    public function test_ca02_roles_without_permission_get_403_and_no_data(): void
    {
        foreach (['zoo-admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $user = $this->createAccount($role);
            foreach ([self::URL.'?'.self::WEEK, self::URL.'/export?'.self::WEEK.'&format=csv', self::URL.'/cashiers'] as $url) {
                $response = $this->actAs($user)->getJson($url)->assertForbidden();
                $this->assertArrayNotHasKey('data', $response->json() ?? []);
            }
        }
    }

    /** CA-02 ticket-cancellation-report */
    public function test_ca02_anonymous_gets_401(): void
    {
        $this->getJson(self::URL.'?'.self::WEEK)->assertUnauthorized();
        $this->getJson(self::URL.'/export?'.self::WEEK.'&format=csv')->assertUnauthorized();
    }

    /** CA-02 ticket-cancellation-report */
    public function test_ca02_admin_without_two_factor_gets_403(): void
    {
        $admin = $this->createAccount('admin', false);

        $this->actAs($admin)->getJson(self::URL.'?'.self::WEEK)
            ->assertForbidden()
            ->assertJsonPath('code', 'two_factor_setup_required');
    }

    /** CA-03 ticket-cancellation-report */
    public function test_ca03_zoo_admin_with_reports_view_is_forbidden(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $this->assertTrue($zooAdmin->can('reports.view'));
        $this->assertFalse($zooAdmin->can('reports.cancellations.view'));

        $this->actAs($zooAdmin)->getJson('/api/v1/admin/reports/tickets?period=week')->assertOk();
        $this->actAs($zooAdmin)->getJson(self::URL.'?'.self::WEEK)->assertForbidden();
    }

    /** CA-01 ticket-cancellation-report: solo admin tiene el permiso nuevo. */
    public function test_ca01_only_admin_holds_the_new_permission(): void
    {
        foreach (['admin' => true, 'zoo-admin' => false, 'executive' => false, 'cashier' => false, 'veterinarian' => false] as $role => $expected) {
            $this->assertSame($expected, $this->createAccount($role)->can('reports.cancellations.view'), $role);
        }
    }

    /** CA-05 ticket-cancellation-report: lista de cajeros del filtro, con eliminados lógicamente (RN-16). */
    public function test_ca05_cashiers_list_includes_soft_deleted_accounts(): void
    {
        $admin = $this->createAccount('admin');
        $active = $this->createAccount('cashier', true, ['first_name' => 'Activa']);
        $gone = $this->createAccount('cashier', true, ['first_name' => 'Eliminada']);
        $gone->delete();

        $list = collect($this->actAs($admin)->getJson(self::URL.'/cashiers')->assertOk()->json('data'))->keyBy('id');

        $this->assertSame(['id', 'name'], array_keys($list[$active->id]));
        $this->assertSame('Activa Prueba', $list[$active->id]['name']);
        $this->assertTrue($list->has($gone->id));
        $this->assertFalse($list->has($admin->id));
    }

    /** CA-02 ticket-cancellation-report: las lecturas del reporte tienen tope por usuario (revisión de seguridad 2026-11-21). */
    public function test_ca02_report_reads_are_throttled_per_user_with_spanish_message(): void
    {
        $admin = $this->createAccount('admin');
        $other = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->clean();
        $urls = [
            self::URL.'?'.self::WEEK,
            self::URL.'/cashiers',
            self::URL."/reviews?cashier_id={$cashier->id}&business_date=2033-03-08",
        ];

        // Las tres lecturas comparten el límite del usuario (60 por minuto).

        foreach (range(1, 20) as $i) {
            foreach ($urls as $url) {
                $this->actAs($admin)->getJson($url)->assertOk();
            }
        }

        foreach ($urls as $url) {
            $this->actAs($admin)->getJson($url)
                ->assertStatus(429)
                ->assertJsonPath('message', 'Demasiadas consultas al reporte. Espera un minuto e inténtalo de nuevo.');
        }

        // El límite es por usuario.
        $this->actAs($other)->getJson($urls[0])->assertOk();
    }
}
