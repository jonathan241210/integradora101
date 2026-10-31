<?php

namespace App\Actions\Admin\Reports;

use App\Models\Ticket;

class PresentTicketRow
{
    /**
     * Fila pública del reporte: nunca incluye qr_code ni identidad del cajero.
     */
    public static function from(Ticket $ticket, ?string $timezone = null): array
    {
        return [
            'folio' => (string) $ticket->id,
            'purchased_at' => $ticket->purchased_at
                ?->setTimezone($timezone ?? config('arca.report_timezone'))
                ->format('Y-m-d H:i:s'),
            'adults' => (int) $ticket->adult_quantity,
            'children' => (int) $ticket->child_quantity,
            'total' => SummarizeTicketSalesAction::money(SummarizeTicketSalesAction::toCents($ticket->total_amount)),
        ];
    }
}
