<?php

namespace App\Actions\Admin\Tickets;

use App\Models\TicketPrice;
use Carbon\CarbonInterface;

class ListCurrentTicketPricesAction
{
    public function __construct(private ResolveCurrentTicketPriceAction $resolve) {}

    /**
     * @return array<string, array{current: ?TicketPrice, next: ?TicketPrice}>
     */
    public function execute(?CarbonInterface $at = null): array
    {
        $at ??= now();
        $out = [];
        foreach (TicketPrice::TYPES as $type) {
            $out[$type] = [
                'current' => $this->resolve->execute($type, $at),
                'next' => $this->resolve->next($type, $at),
            ];
        }

        return $out;
    }
}
