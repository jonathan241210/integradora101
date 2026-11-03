<?php

namespace App\Actions\Admin\Tickets;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\TicketPrice;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ScheduleTicketPriceChangeAction
{
    public const MODE_IMMEDIATE = 'immediate';

    public const MODE_SCHEDULED = 'scheduled';

    public function __construct(
        private LogAdminActivityAction $log,
        private ListCurrentTicketPricesAction $current,
    ) {}

    /**
     * Crea las filas de adulto y niño con el mismo effective_at (RN-06). No modifica filas previas
     * ni crea avisos o correos (diferidos).
     *
     * @return array{prices: list<TicketPrice>, current: array}
     */
    public function execute(User $actor, mixed $adultAmount, mixed $childAmount, string $mode, ?CarbonImmutable $effectiveAt): array
    {
        $now = CarbonImmutable::now('UTC');

        if ($mode === self::MODE_SCHEDULED) {
            if ($effectiveAt === null || $effectiveAt->lt($now->startOfSecond())) {
                throw ValidationException::withMessages([
                    'effective_at' => ['La fecha y hora del cambio no puede ser anterior al momento actual.'],
                ]);
            }
            $effective = $effectiveAt->utc()->startOfSecond();
        } else {
            $effective = $now->startOfSecond();
        }

        $amounts = [
            TicketPrice::TYPE_ADULT => number_format((float) $adultAmount, 2, '.', ''),
            TicketPrice::TYPE_CHILD => number_format((float) $childAmount, 2, '.', ''),
        ];

        $prices = DB::transaction(function () use ($actor, $amounts, $effective, $mode) {
            $rows = [];
            foreach ($amounts as $type => $amount) {
                $row = TicketPrice::query()->create([
                    'ticket_type' => $type,
                    'amount' => $amount,
                    'effective_at' => $effective,
                    'created_by' => $actor->id,
                ]);
                $this->log->execute('ticket-price-changed', 'Precio de boleto cambiado', $row, [
                    'ticket_type' => $type,
                    'amount' => $amount,
                    'effective_at' => $effective->toIso8601ZuluString(),
                    'mode' => $mode,
                ]);
                $rows[] = $row;
            }

            return $rows;
        });

        return ['prices' => $prices, 'current' => $this->current->execute()];
    }
}
