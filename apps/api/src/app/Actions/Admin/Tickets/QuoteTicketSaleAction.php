<?php

namespace App\Actions\Admin\Tickets;

use App\Models\TicketPrice;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

/**
 * Cotiza una venta con los precios vigentes en un instante, sin escribir nada (api-009 CA-46, RN-34).
 * La usan la cotización y la venta, para que ambas calculen lo mismo.
 */
class QuoteTicketSaleAction
{
    /** Máximo de céntimos que admite tickets.total_amount (DECIMAL(8,2)). */
    private const MAX_TOTAL_CENTS = 99999999;

    public function __construct(
        private ResolveCurrentTicketPriceAction $resolvePrice,
        private CalculateTicketTotalAction $calculateTotal,
    ) {}

    public function execute(int $adultQuantity, int $childQuantity, ?CarbonImmutable $at = null): TicketQuote
    {
        $at ??= CarbonImmutable::now('UTC')->startOfSecond();

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

        return new TicketQuote(
            $adult,
            $child,
            CalculateTicketTotalAction::format($adultQuantity * CalculateTicketTotalAction::toCents($adult->amount)),
            CalculateTicketTotalAction::format($childQuantity * CalculateTicketTotalAction::toCents($child->amount)),
            $total,
        );
    }
}
