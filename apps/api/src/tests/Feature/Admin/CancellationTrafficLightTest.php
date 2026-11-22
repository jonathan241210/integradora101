<?php

namespace Tests\Feature\Admin;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/** api-027: forma del reporte con semáforo, leyenda y datos de demostración como datos normales. */
class CancellationTrafficLightTest extends CancellationReviewTestCase
{
    /** CA-01 cancellation-review-signals */
    public function test_ca01_admin_gets_cashier_day_traffic_light_and_legend(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura', 'last_name' => 'Cruz']);
        $this->wipe();
        $this->attentionDay($cashier, self::DAY);

        $data = $this->actAs($admin)->getJson(self::URL.'?'.self::RANGE)->assertOk()->json('data');

        // Bloques de api-022 intactos más los nuevos.
        foreach (['period', 'totals', 'reconciliation', 'rows', 'legend', 'levels', 'disclaimer'] as $key) {
            $this->assertArrayHasKey($key, $data);
        }
        foreach (['days', 'cashiers', 'cashier_days'] as $key) {
            $this->assertArrayHasKey($key, $data['reconciliation']);
        }

        $day = $this->cashierDay($data, $cashier->id, self::DAY);
        foreach (['cashier_id', 'cashier_name', 'date', 'traffic_light', 'traffic_light_label', 'signals_count', 'reasons', 'reason_sentence', 'action', 'review'] as $key) {
            $this->assertArrayHasKey($key, $day);
        }
        $this->assertSame('Laura Cruz', $day['cashier_name']);
        $this->assertSame('attention', $day['traffic_light']);
        $this->assertSame(['code', 'label', 'count', 'detail', 'folios'], array_keys($day['reasons'][0]));
    }

    /** CA-15 cancellation-review-signals */
    public function test_ca15_lists_every_active_cashier_day_including_normal(): void
    {
        $admin = $this->createAccount('admin');
        $laura = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $beto = $this->createAccount('cashier', true, ['first_name' => 'Beto']);
        $this->wipe();
        $this->normalDay($laura, '2019-03-04');
        $this->completed($laura, '2019-03-05', 3);
        $this->completed($beto, '2019-03-05', 2);
        // El sábado no hay ventas de nadie. Un boleto sin cajero forma su propio grupo.
        $this->insertSale(null, $this->utc('2019-03-06', '10:00:00')->format('Y-m-d H:i:s'));

        $rows = $this->report($admin, self::RANGE)['reconciliation']['cashier_days'];

        $this->assertSame(
            [[$laura->id, '2019-03-04'], [$beto->id, '2019-03-05'], [$laura->id, '2019-03-05'], [null, '2019-03-06']],
            array_map(fn ($r) => [$r['cashier_id'], $r['date']], $rows),
        );
        $this->assertSame(['normal', 'normal', 'normal', null], array_column($rows, 'traffic_light'));
        $this->assertNotContains('2019-03-09', array_column($rows, 'date'));

        $noCashier = $rows[3];
        $this->assertSame('Sin cajero registrado', $noCashier['cashier_name']);
        $this->assertNull($noCashier['traffic_light_label']);
        $this->assertSame('No aplica: el día no tiene cajero registrado.', $noCashier['action']);
        $this->assertSame([], $noCashier['reasons']);
        $this->assertNull($noCashier['review']);
    }

    /** CA-26 cancellation-review-signals */
    public function test_ca26_legend_lists_each_signal_with_limit_and_disclaimer(): void
    {
        $admin = $this->createAccount('admin');
        $this->wipe();

        $data = $this->report($admin, self::RANGE);

        $this->assertSame(
            ['over_limit_percent', 'late_cancellations', 'repeated_other', 'same_amount', 'long_cancellations', 'own_baseline', 'peer_comparison'],
            array_column($data['legend'], 'code'),
        );
        foreach ($data['legend'] as $item) {
            $this->assertSame(['code', 'label', 'explanation', 'limit'], array_keys($item));
            $this->assertNotSame('', $item['explanation']);
            $this->assertNotSame('', $item['limit']);
        }
        $this->assertStringContainsString('Más de 10 %', $data['legend'][0]['limit']);
        $this->assertStringContainsString('30 minutos', $data['legend'][1]['limit']);
        $this->assertSame('Una alerta no prueba nada: solo indica qué revisar.', $data['disclaimer']);
    }

    /** CA-33 cancellation-review-signals */
    public function test_ca33_demo_cashiers_appear_in_reports_as_normal_data(): void
    {
        $admin = $this->createAccount('admin');
        config(['arca.demo_staff_password' => 'Demo-Passw0rd!2026']);

        Artisan::call('arca:demo:cancellation-reviews', ['--days' => 7]);

        $today = CarbonImmutable::now(config('arca.timezone'));
        $query = 'period=custom&from='.$today->subDays(6)->toDateString().'&to='.$today->toDateString();
        $report = $this->report($admin, $query);

        $demoIds = DB::table('users')->where('email', 'like', 'demo-cancel-%@arca.local')->pluck('id')->all();
        $this->assertCount(3, $demoIds);
        $demoRows = array_filter($report['reconciliation']['cashier_days'], fn ($r) => in_array($r['cashier_id'], $demoIds, true));
        $this->assertNotEmpty($demoRows);
        foreach ($demoRows as $row) {
            $this->assertContains($row['traffic_light'], ['normal', 'review', 'attention']);
        }
        // Los boletos cancelados de demostración salen en las filas y en los totales como cualquier otro.
        $this->assertGreaterThan(0, $report['totals']['cancelled_tickets']);
        $this->assertNotEmpty(array_filter($report['totals']['by_cashier'], fn ($r) => in_array($r['cashier_id'], $demoIds, true)));

        // También se pueden filtrar por cajero como cualquier otro.
        $filtered = $this->report($admin, $query.'&cashier_id='.$demoIds[0]);
        $this->assertNotEmpty($filtered['rows']);
    }
}
