<?php

namespace App\Actions\Admin\Reports;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Cuentas elegibles para el filtro «Cajero» del reporte de cancelaciones: rol `cashier` o con boletos
 * vendidos, incluidas las eliminadas lógicamente (api-022 RN-12, RN-16).
 */
class ListCancellationCashiersAction
{
    public function query(): Builder
    {
        return User::query()->withTrashed()->where(function (Builder $q): void {
            $q->whereHas('roles', fn (Builder $r) => $r->where('name', 'cashier'))
                ->orWhereIn('id', DB::table('tickets')->select('cashier_id'));
        });
    }

    public function exists(int $id): bool
    {
        return $this->query()->whereKey($id)->exists();
    }

    /** @return list<array{id: int, name: string}> */
    public function execute(): array
    {
        return $this->query()
            ->orderBy('first_name')->orderBy('last_name')->orderBy('second_last_name')->orderBy('id')
            ->get()
            ->map(fn (User $user): array => [
                'id' => (int) $user->id,
                'name' => PresentCancelledTicketRow::personName($user) ?? '',
            ])
            ->all();
    }
}
