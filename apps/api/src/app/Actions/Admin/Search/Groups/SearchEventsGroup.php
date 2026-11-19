<?php

namespace App\Actions\Admin\Search\Groups;

use Illuminate\Support\Facades\DB;

class SearchEventsGroup extends SearchGroup
{
    public function section(): string
    {
        return 'events';
    }

    public function label(): string
    {
        return 'Eventos';
    }

    public function permission(): string
    {
        return 'events.manage';
    }

    protected function candidates(): array
    {
        return DB::table('events')
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->limit($this->candidateLimit)
            ->get(['id', 'name', 'description', 'location', 'is_active'])
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'title' => (string) $row->name,
                'subtitle' => $row->is_active ? 'Activo' : 'Inactivo',
                'fields' => [
                    [null, (string) $row->name],
                    ['Descripción', $row->description],
                    ['Ubicación', $row->location],
                ],
            ])
            ->all();
    }
}
