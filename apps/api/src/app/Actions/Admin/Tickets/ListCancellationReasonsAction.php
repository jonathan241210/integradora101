<?php

namespace App\Actions\Admin\Tickets;

use App\Enums\TicketCancellationReason;

/** Catálogo de motivos de cancelación en orden (api-022 CA-10, RN-02). */
class ListCancellationReasonsAction
{
    /** @return list<array{code: string, label: string, comment_policy: string}> */
    public function execute(): array
    {
        return array_map(fn (TicketCancellationReason $reason): array => [
            'code' => $reason->value,
            'label' => $reason->label(),
            'comment_policy' => $reason->commentPolicy(),
        ], TicketCancellationReason::cases());
    }
}
