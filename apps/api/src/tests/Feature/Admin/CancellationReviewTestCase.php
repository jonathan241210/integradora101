<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Apoyo de las pruebas de api-027. Usa días de 2019 (antes de cualquier dato de arca_pruebas) para que ni los
 * compañeros ni el histórico reales alteren el semáforo; los datos viven dentro de la transacción de la prueba.
 */
abstract class CancellationReviewTestCase extends CancellationReportTestCase
{
    /** Miércoles; su semana va del 2019-03-04 al 2019-03-10. */
    protected const DAY = '2019-03-06';

    protected const RANGE = 'period=custom&from=2019-03-04&to=2019-03-10';

    protected function utc(string $date, string $time): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$date} {$time}", config('arca.timezone'))->utc();
    }

    /** Venta completada a una hora local de negocio. */
    protected function saleAt(User $cashier, string $date, string $time, array $override = []): int
    {
        return $this->insertSale($cashier, $this->utc($date, $time)->format('Y-m-d H:i:s'), $override);
    }

    /** Venta cancelada `$afterSeconds` segundos después de venderse (hora local de la venta). */
    protected function cancelAt(User $cashier, string $date, string $time, int $afterSeconds = 180, string $code = 'capture_error', string $amount = '25.00', ?string $comment = null): int
    {
        $purchased = $this->utc($date, $time);

        return $this->insertSale($cashier, $purchased->format('Y-m-d H:i:s'), [
            'status' => 'cancelled',
            'total_amount' => $amount,
            'cancelled_at' => $purchased->addSeconds($afterSeconds)->format('Y-m-d H:i:s'),
            'cancelled_by' => $cashier->id,
            'cancellation_reason_code' => $code,
            'cancellation_reason' => $comment,
        ]);
    }

    /** `$count` ventas completadas cada 5 minutos desde las 10:00 locales. */
    protected function completed(User $cashier, string $date, int $count, string $from = '10:00:00'): void
    {
        $start = $this->utc($date, $from);
        for ($i = 0; $i < $count; $i++) {
            $this->insertSale($cashier, $start->addMinutes($i * 5)->format('Y-m-d H:i:s'));
        }
    }

    /**
     * Día completo con `$completed` ventas y cancelaciones tempranas (9:00 en adelante, 3 minutos después de la
     * venta) con importes distintos, para que no salten señales por accidente.
     *
     * @param  list<string>  $codes  motivo de cada cancelación
     */
    protected function dayWithCancels(User $cashier, string $date, int $completed, array $codes = []): void
    {
        $this->completed($cashier, $date, $completed);
        foreach ($codes as $i => $code) {
            $this->cancelAt($cashier, $date, sprintf('09:%02d:00', $i * 5), 180, $code, number_format(25 + $i, 2, '.', ''), $code === 'other' ? 'Otro motivo' : null);
        }
    }

    /** Día en Atención: dos cancelaciones «Otro» al cierre con importes distintos (S2 y S3). */
    protected function attentionDay(User $cashier, string $date): void
    {
        $this->completed($cashier, $date, 18);
        $this->cancelAt($cashier, $date, '11:10:00', 60, 'other', '25.00', 'Cancelación al cierre uno');
        $this->cancelAt($cashier, $date, '11:15:00', 60, 'other', '30.00', 'Cancelación al cierre dos');
    }

    /** Día en Revisar: dos cancelaciones del mismo importe entre 40 ventas (solo S4). */
    protected function reviewDay(User $cashier, string $date): void
    {
        $this->completed($cashier, $date, 38);
        $this->cancelAt($cashier, $date, '09:00:00', 180, 'capture_error', '25.00');
        $this->cancelAt($cashier, $date, '09:10:00', 180, 'capture_error', '25.00');
    }

    /** Día Normal: 15 ventas y una cancelación legítima. */
    protected function normalDay(User $cashier, string $date): void
    {
        $this->completed($cashier, $date, 14);
        $this->cancelAt($cashier, $date, '09:00:00', 180, 'capture_error', '25.00');
    }

    protected function wipe(): void
    {
        $this->assertGreaterThan(0, DB::transactionLevel());
        $this->clean('2019-01-01 00:00:00', '2019-04-30 00:00:00');
    }

    /** Fila del semáforo de un cajero y día, o null. */
    protected function cashierDay(array $report, ?int $cashierId, string $date): ?array
    {
        foreach ($report['reconciliation']['cashier_days'] as $row) {
            if ($row['cashier_id'] === $cashierId && $row['date'] === $date) {
                return $row;
            }
        }

        return null;
    }

    /** @return list<string> */
    protected function signalCodes(?array $day): array
    {
        return array_column($day['reasons'] ?? [], 'code');
    }

    /** Reporte semanal de 2019 y la fila del cajero en `DAY`. */
    protected function dayOf(User $admin, User $cashier, string $date = self::DAY): array
    {
        $day = $this->cashierDay($this->report($admin, self::RANGE), $cashier->id, $date);
        $this->assertNotNull($day, 'El cajero debe aparecer en el semáforo de ese día.');

        return $day;
    }
}
