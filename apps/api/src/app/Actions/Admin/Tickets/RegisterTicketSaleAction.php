<?php

namespace App\Actions\Admin\Tickets;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Ticket;
use App\Models\TicketPrice;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisterTicketSaleAction
{
    /** Máximo de céntimos que admite tickets.total_amount (DECIMAL(8,2)). */
    private const MAX_TOTAL_CENTS = 99999999;

    public function __construct(
        private ResolveCurrentTicketPriceAction $resolvePrice,
        private CalculateTicketTotalAction $calculateTotal,
        private IssueTicketQrTokenAction $issueToken,
        private RenderTicketQrSvgAction $renderSvg,
        private LogAdminActivityAction $log,
    ) {}

    public function execute(User $cashier, int $adultQuantity, int $childQuantity): IssuedTicketSale
    {
        return DB::transaction(function () use ($cashier, $adultQuantity, $childQuantity) {
            $at = CarbonImmutable::now('UTC')->startOfSecond();

            $adult = $this->resolvePrice->execute(TicketPrice::TYPE_ADULT, $at);
            $child = $this->resolvePrice->execute(TicketPrice::TYPE_CHILD, $at);

            if ($adult === null || $child === null) {
                throw ValidationException::withMessages([
                    ($adult === null ? 'adult_quantity' : 'child_quantity') => ['No hay un precio vigente configurado para este tipo de boleto.'],
                ]);
            }

            $total = $this->calculateTotal->execute($adultQuantity, $adult->amount, $childQuantity, $child->amount);

            if (CalculateTicketTotalAction::toCents($total) > self::MAX_TOTAL_CENTS) {
                throw ValidationException::withMessages([
                    'adult_quantity' => ['El total de la venta excede el importe máximo permitido.'],
                ]);
            }

            $token = $this->issueToken->execute();

            $ticket = Ticket::query()->create([
                'adult_quantity' => $adultQuantity,
                'child_quantity' => $childQuantity,
                'status' => Ticket::STATUS_COMPLETED,
                'payment_method' => 'cash',
                'adult_unit_price' => $adult->amount,
                'child_unit_price' => $child->amount,
                'total_amount' => $total,
                'purchased_at' => $at,
                'qr_code' => $token,
                'cashier_id' => $cashier->id,
            ]);

            $svg = $this->renderSvg->execute($token);

            $this->log->execute('ticket-sold', 'Boleto vendido', $ticket, [
                'folio' => $ticket->id,
                'adult_quantity' => $adultQuantity,
                'child_quantity' => $childQuantity,
                'total_amount' => $total,
            ]);

            $ticket->load('cashier');

            return new IssuedTicketSale($ticket, $svg);
        });
    }
}
