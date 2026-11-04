<?php

namespace App\Actions\Admin\Tickets;

use App\Actions\Admin\Reports\ResolveRequestedTimezoneAction;
use App\Models\Ticket;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListTicketHistoryAction
{
    /** Roles con lectura de todos los boletos (api-009 RN-17); cualquier otro ve solo los suyos. */
    private const FULL_READ_ROLES = ['admin', 'zoo-admin'];

    public function __construct(
        private IsTicketCancellableAction $cancellable,
        private ResolveRequestedTimezoneAction $resolveTimezone,
    ) {}

    /**
     * @param  array{folio?: int|string|null, status?: string|null, from?: string|null, to?: string|null, per_page?: int|string|null}  $filters
     */
    public function execute(User $user, array $filters, mixed $requestedTimezone = null): LengthAwarePaginator
    {
        // Solo interpreta from/to; `cancellable` usa la zona del zoológico (RN-16).
        $timezone = $this->resolveTimezone->execute($requestedTimezone);

        $query = Ticket::query()
            ->with('cashier:id,first_name,last_name,second_last_name')
            ->orderByDesc('purchased_at')
            ->orderByDesc('id');

        if (! $user->hasAnyRole(self::FULL_READ_ROLES)) {
            $query->where('cashier_id', $user->id);
        }

        if (! empty($filters['folio'])) {
            $query->whereKey((int) $filters['folio']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['from'])) {
            $query->where('purchased_at', '>=', CarbonImmutable::parse($filters['from'].' 00:00:00', $timezone)->utc());
        }
        if (! empty($filters['to'])) {
            $query->where('purchased_at', '<', CarbonImmutable::parse($filters['to'].' 00:00:00', $timezone)->addDay()->utc());
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
