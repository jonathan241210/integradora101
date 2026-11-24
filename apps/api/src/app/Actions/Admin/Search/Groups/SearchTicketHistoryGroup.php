<?php

namespace App\Actions\Admin\Search\Groups;

use App\Enums\TicketCancellationReason;
use App\Support\BusinessTimezone;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SearchTicketHistoryGroup extends SearchGroup
{
    private const PAYMENT_METHODS = ['cash' => 'Efectivo'];

    /** CA-45 y CA-48: sin comprador, sin `qr_code` y sin cajero. */
    private const COLUMNS = ['id', 'status', 'payment_method', 'cancellation_reason_code', 'cancellation_reason', 'purchased_at'];

    public function section(): string
    {
        return 'ticket-history';
    }

    public function label(): string
    {
        return 'Historial de boletos';
    }

    public function permission(): string
    {
        return 'tickets.view';
    }

    protected function searchesById(): bool
    {
        return true;
    }

    protected function candidates(): array
    {
        return DB::table('tickets')
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->limit($this->candidateLimit)
            ->get(self::COLUMNS)
            ->map(fn (object $row): array => $this->candidate($row))
            ->all();
    }

    protected function byId(int $id): ?array
    {
        $row = DB::table('tickets')->whereNull('deleted_at')->where('id', $id)->first(self::COLUMNS);

        return $row === null ? null : $this->candidate($row);
    }

    private function candidate(object $row): array
    {
        $date = $row->purchased_at === null
            ? null
            : Carbon::parse($row->purchased_at)->timezone(BusinessTimezone::name())->format('d/m/Y');
        $cancelled = $row->status === 'cancelled';
        $status = match ($row->status) {
            'cancelled' => 'Cancelado',
            'completed' => 'Vigente Completado',
            default => (string) $row->status,
        };

        return [
            'id' => (int) $row->id,
            'title' => 'Boleto #'.$row->id,
            'subtitle' => 'Comprado el '.($date ?? '—').' · '.($cancelled ? 'Cancelado' : 'Vigente'),
            'fields' => [
                ['Estado', $status],
                ['Forma de pago', self::PAYMENT_METHODS[$row->payment_method] ?? $row->payment_method],
                ['Motivo de cancelación', $cancelled ? $this->reasonText($row) : null],
                ['Fecha de compra', $date],
            ],
        ];
    }

    /** Etiqueta del motivo derivada del código (api-022 RN-17) y, si existe, el comentario guardado. */
    private function reasonText(object $row): string
    {
        $label = TicketCancellationReason::labelFor(TicketCancellationReason::tryFrom((string) $row->cancellation_reason_code));

        return $row->cancellation_reason === null || $row->cancellation_reason === ''
            ? $label
            : $label.': '.$row->cancellation_reason;
    }
}
