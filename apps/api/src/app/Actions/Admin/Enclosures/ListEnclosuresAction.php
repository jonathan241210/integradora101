<?php

namespace App\Actions\Admin\Enclosures;

use App\Models\Enclosure;
use Illuminate\Database\Eloquent\Collection;

class ListEnclosuresAction
{
    /**
     * @return Collection<int, Enclosure>
     */
    public function execute(): Collection
    {
        return Enclosure::query()
            ->withCount('animals')
            ->withExists(['qrCodes as has_active_qr' => fn ($query) => $query->where('is_active', true)])
            ->orderBy('name')
            ->orderBy('id')
            ->get();
    }
}
