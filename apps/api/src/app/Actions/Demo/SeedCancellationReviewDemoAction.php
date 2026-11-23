<?php

namespace App\Actions\Demo;

use App\Enums\TicketCancellationReason;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\User;
use App\Support\BusinessTimezone;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

/**
 * Datos de demostración del semáforo de cancelaciones (api-027 RN-16, RN-17, RN-18, CA-29 a CA-32).
 * Solo en `arca_pruebas`; nunca en producción. Solo inserta (idempotente por correo y por `qr_code`): no actualiza ni
 * borra nada. Las cancelaciones se escriben directo, no con CancelTicketAction, porque api-009 RN-16 solo permite
 * cancelar el mismo día y aquí se necesitan días pasados.
 */
class SeedCancellationReviewDemoAction
{
    public const DATABASE = 'arca_pruebas';

    public const QR_PREFIX = 'DEMO-CANCEL-';

    private const CASHIERS = [
        1 => ['email' => 'demo-cancel-1@arca.local', 'second' => 'Uno'],
        2 => ['email' => 'demo-cancel-2@arca.local', 'second' => 'Dos'],
        3 => ['email' => 'demo-cancel-3@arca.local', 'second' => 'Tres'],
    ];

    /** @var array<string, int> `qr_code` de demostración que ya existen (se leen una sola vez por corrida). */
    private array $existing = [];

    /** Motivo por el que no debe correr (otra base distinta de arca_pruebas o producción); null si puede. */
    public function refusal(): ?string
    {
        $database = (string) config('database.connections.'.config('database.default').'.database');

        if ($database !== self::DATABASE || app()->environment('production')) {
            return 'Este comando solo corre en la base arca_pruebas y nunca en producción. No se escribió nada.';
        }

        return null;
    }

    /**
     * @return int boletos nuevos
     *
     * @throws \DomainException si falta configuración o catálogos (mensaje en español para la consola)
     */
    public function execute(int $days): int
    {
        $cashiers = $this->cashiers();

        return DB::transaction(function () use ($cashiers, $days): int {
            $created = 0;
            $this->existing = array_flip(Ticket::withTrashed()->where('qr_code', 'like', self::QR_PREFIX.'%')->pluck('qr_code')->all());
            $today = CarbonImmutable::parse(BusinessTimezone::today(), 'UTC');
            for ($k = $days - 1; $k >= 0; $k--) {
                $date = $today->subDays($k)->toDateString();
                foreach ($cashiers as $index => $cashier) {
                    $created += $this->seedDay($cashier, $index, $date);
                }
            }

            return $created;
        });
    }

    /** @return array<int, User> */
    private function cashiers(): array
    {
        $existing = User::withTrashed()->whereIn('email', array_column(self::CASHIERS, 'email'))->get()->keyBy('email');
        $missing = array_filter(self::CASHIERS, fn (array $c): bool => ! $existing->has($c['email']));
        $password = config('arca.demo_staff_password');

        if ($missing !== []) {
            if (! is_string($password) || $password === '') {
                throw new \DomainException('Configura DEMO_STAFF_PASSWORD en .env antes de crear los cajeros de demostración.');
            }
            if (! Role::query()->where('name', 'cashier')->exists()) {
                throw new \DomainException('Falta el rol cashier: corre el seeder de roles y permisos.');
            }
            $department = Department::query()->where('code', 'box-office')->first();
            if ($department === null) {
                throw new \DomainException('Falta el área de taquilla (box-office): corre el seeder de áreas.');
            }
        }

        $out = [];
        foreach (self::CASHIERS as $index => $account) {
            $user = $existing->get($account['email']);
            if ($user === null) {
                $user = User::query()->create([
                    'first_name' => 'Demo',
                    'last_name' => 'Cancelaciones',
                    'second_last_name' => $account['second'],
                    'email' => $account['email'],
                    'password' => $password,
                    'department_id' => $department->id,
                    'is_active' => true,
                ]);
                $user->assignRole('cashier');
            }
            $out[$index] = $user;
        }

        return $out;
    }

    /**
     * Patrón del día según la fecha y el cajero: normal (una cancelación legítima), revisar (una señal: mismo
     * importe) o atención (dos señales: motivo «Otro» repetido y cancelaciones al cierre).
     */
    private function dayType(string $date, int $index): string
    {
        $ordinal = intdiv(CarbonImmutable::parse($date, 'UTC')->getTimestamp(), 86400);

        return match (($ordinal + $index * 2) % 7) {
            0 => 'attention',
            1, 4 => 'review',
            default => 'normal',
        };
    }

    /** Inserta los boletos del día que aún no existan. Devuelve cuántos creó. */
    private function seedDay(User $cashier, int $index, string $date): int
    {
        $type = $this->dayType($date, $index);
        [$count, $cancels] = match ($type) {
            // índice del boleto => [minutos hasta cancelar, motivo, hijo (importe distinto)]
            'attention' => [20, [17 => [1, TicketCancellationReason::Other, true], 18 => [1, TicketCancellationReason::Other, false]]],
            'review' => [40, [4 => [3, TicketCancellationReason::CaptureError, false], 8 => [3, TicketCancellationReason::CaptureError, false]]],
            default => [15, [2 => [3, TicketCancellationReason::CaptureError, false]]],
        };

        $window = $this->windowMinutes($date);
        if ($window < 60) {
            return 0;
        }

        $created = 0;
        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$date} 10:00", BusinessTimezone::name());

        for ($i = 0; $i < $count; $i++) {
            $qr = sprintf('%s%s-%d%02d', self::QR_PREFIX, str_replace('-', '', $date), $index, $i);
            if (isset($this->existing[$qr])) {
                continue;
            }

            $purchased = $start->addMinutes(intdiv($i * $window, $count))->utc();
            $cancel = $cancels[$i] ?? null;
            $child = $cancel !== null && $cancel[2];

            $ticket = Ticket::query()->create([
                'adult_quantity' => $child ? 0 : 1,
                'child_quantity' => $child ? 1 : 0,
                'status' => $cancel === null ? Ticket::STATUS_COMPLETED : Ticket::STATUS_CANCELLED,
                'payment_method' => 'cash',
                'adult_unit_price' => '25.00',
                'child_unit_price' => '16.00',
                'total_amount' => $child ? '16.00' : '25.00',
                'purchased_at' => $purchased,
                'cancelled_at' => $cancel === null ? null : $purchased->addMinutes($cancel[0]),
                'cancelled_by' => $cancel === null ? null : $cashier->id,
                'cancellation_reason_code' => $cancel[1] ?? null,
                'cancellation_reason' => $cancel === null ? null : ($cancel[1] === TicketCancellationReason::Other ? 'Cancelación de demostración.' : null),
                'qr_code' => $qr,
                'cashier_id' => $cashier->id,
            ]);
            $created++;

            if ($cancel !== null) {
                activity('admin')->causedBy($cashier)->performedOn($ticket)->event('ticket-cancelled')
                    ->withProperties([
                        'folio' => $ticket->id,
                        'total_amount' => $ticket->total_amount,
                        'reason_code' => $cancel[1]->value,
                        'demo' => true,
                    ])
                    ->log('Boleto cancelado (demostración)');
            }
        }

        return $created;
    }

    /** Minutos de venta del día a partir de las 10:00 locales; hoy se acorta para no crear ventas futuras. */
    private function windowMinutes(string $date): int
    {
        if ($date !== BusinessTimezone::today()) {
            return 300;
        }

        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$date} 10:00", BusinessTimezone::name());

        return min(300, max(0, (int) $start->diffInMinutes(BusinessTimezone::now(), false)) - 10);
    }
}
