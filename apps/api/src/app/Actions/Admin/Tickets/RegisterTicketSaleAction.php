<?php

namespace App\Actions\Admin\Tickets;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Ticket;
use App\Models\TicketPrice;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class RegisterTicketSaleAction
{
    public function __construct(
        private QuoteTicketSaleAction $quote,
        private IssueTicketQrTokenAction $issueToken,
        private RenderTicketQrSvgAction $renderSvg,
        private LogAdminActivityAction $log,
    ) {}

    /**
     * Una fila por boleto (adultos primero, después niños), todas en una sola transacción (api-009 CA-50, CA-52).
     * El total de la compra sale de QuoteTicketSaleAction (CA-46).
     */
    public function execute(User $cashier, int $adultQuantity, int $childQuantity): IssuedTicketPurchase
    {
        return DB::transaction(function () use ($cashier, $adultQuantity, $childQuantity) {
            $at = CarbonImmutable::now('UTC')->startOfSecond();

            $quote = $this->quote->execute($adultQuantity, $childQuantity, $at);
            $adult = $quote->adultPrice;
            $child = $quote->childPrice;

            $units = [
                ...array_fill(0, $adultQuantity, TicketPrice::TYPE_ADULT),
                ...array_fill(0, $childQuantity, TicketPrice::TYPE_CHILD),
            ];

            $issued = [];
            foreach ($units as $type) {
                $isAdult = $type === TicketPrice::TYPE_ADULT;
                $unitPrice = CalculateTicketTotalAction::format(CalculateTicketTotalAction::toCents($isAdult ? $adult->amount : $child->amount));
                $token = $this->issueToken->execute();

                $ticket = Ticket::query()->create([
                    'adult_quantity' => $isAdult ? 1 : 0,
                    'child_quantity' => $isAdult ? 0 : 1,
                    'status' => Ticket::STATUS_COMPLETED,
                    'payment_method' => 'cash',
                    'adult_unit_price' => $adult->amount,
                    'child_unit_price' => $child->amount,
                    'total_amount' => $unitPrice,
                    'purchased_at' => $at,
                    'qr_code' => $token,
                    'cashier_id' => $cashier->id,
                ]);

                $svg = $this->renderSvg->execute($token);

                $this->log->execute('ticket-sold', 'Boleto vendido', $ticket, [
                    'folio' => $ticket->id,
                    'ticket_type' => $type,
                    'unit_price' => $unitPrice,
                    'total_amount' => $unitPrice,
                ]);

                $ticket->setRelation('cashier', $cashier);
                $issued[] = new IssuedTicketSale($ticket, $svg, $type);
            }

            return new IssuedTicketPurchase($issued, $adultQuantity, $childQuantity, $quote->totalAmount, $at);
        });
    }
}
