<?php

namespace App\Actions\Admin\Search\Groups;

use Illuminate\Support\Facades\DB;

class SearchNewsGroup extends SearchGroup
{
    public function section(): string
    {
        return 'news';
    }

    public function label(): string
    {
        return 'Noticias';
    }

    public function permission(): string
    {
        return 'news.manage';
    }

    protected function candidates(): array
    {
        return DB::table('news')
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->limit($this->candidateLimit)
            ->get(['id', 'title', 'description', 'content', 'category', 'is_active'])
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'title' => (string) $row->title,
                'subtitle' => $row->is_active ? 'Activa' : 'Inactiva',
                'fields' => [
                    [null, (string) $row->title],
                    ['Descripción', $row->description],
                    ['Contenido', $row->content],
                    ['Categoría', $row->category],
                ],
            ])
            ->all();
    }
}
