<?php

namespace App\Actions\Admin\Search\Groups;

use Illuminate\Support\Facades\DB;

class SearchEnclosuresGroup extends SearchGroup
{
    public function section(): string
    {
        return 'enclosures';
    }

    public function label(): string
    {
        return 'Recintos';
    }

    public function permission(): string
    {
        return 'enclosures.manage';
    }

    protected function candidates(): array
    {
        return DB::table('enclosures')
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->limit($this->candidateLimit)
            ->get(['id', 'name', 'is_active'])
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'title' => (string) $row->name,
                'subtitle' => $row->is_active ? 'Activo' : 'Inactivo',
                'fields' => [[null, (string) $row->name]],
            ])
            ->all();
    }
}
