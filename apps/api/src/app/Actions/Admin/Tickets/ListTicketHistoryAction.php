<?php

namespace App\Actions\Admin\Tickets;

use App\Models\Ticket;
use App\Models\User;
use App\Support\BusinessTimezone;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListTicketHistoryAction
{
    public function __construct(private IsTicketCancellableAction $cancellable) {}

    /**
     * @param  array{folio?: int|string|null, status?: string|null, from?: string|null, to?: string|null, per_page?: int|string|null}  $filters
     */
    public function execute(User $user, array $filters): LengthAwarePaginator
    {
        $query = Ticket::query()
            ->with('cashier:id,first_name,last_name,second_last_name')
            ->orderByDesc('purchased_at')
            ->orderByDesc('id');

        // api-023 RN-03: la lectura total es un permiso (`tickets.view-all`); cualquier otro ve solo los suyos.
        if (! $user->can('tickets.view-all')) {
            $query->where('cashier_id', $user->id);
        }

        if (! empty($filters['folio'])) {
            $query->whereKey((int) $filters['folio']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['from'])) {
            $query->where('purchased_at', '>=', BusinessTimezone::startOfDayUtc($filters['from']));
        }
        if (! empty($filters['to'])) {
            $query->where('purchased_at', '<', BusinessTimezone::endOfDayUtc($filters['to']));
        }

        $perPage = min(max((int) ($filters['per_page'] ?? 25), 1), 100);
        $page = $query->paginate($perPage);

        $now = CarbonImmutable::now('UTC');
        $page->getCollection()->each(fn (Ticket $ticket) => $ticket->setAttribute(
            'cancellable',
            $this->cancellable->execute($user, $ticket, $now),
        ));

        return $page;
    }
}
