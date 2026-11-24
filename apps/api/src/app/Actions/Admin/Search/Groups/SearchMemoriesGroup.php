<?php

namespace App\Actions\Admin\Search\Groups;

use Illuminate\Support\Facades\DB;

class SearchMemoriesGroup extends SearchGroup
{
    private const STATUS = [
        'submitted' => 'Enviado',
        'in_review' => 'En revisión',
        'accepted' => 'Aceptado',
        'rejected' => 'Rechazado',
    ];

    /** CA-44: nunca se consulta `visitor_id` ni dato alguno del visitante. */
    private const COLUMNS = ['id', 'status', 'opinion', 'rejection_reason'];

    public function section(): string
    {
        return 'memories';
    }

    public function label(): string
    {
        return 'Momentos';
    }

    public function permission(): string
    {
        return 'memories.review';
    }

    protected function searchesById(): bool
    {
        return true;
    }

    protected function candidates(): array
    {
        return DB::table('visitor_memories')
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->limit($this->candidateLimit)
            ->get(self::COLUMNS)
            ->map(fn (object $row): array => $this->candidate($row))
            ->all();
    }

    protected function byId(int $id): ?array
    {
        $row = DB::table('visitor_memories')->whereNull('deleted_at')->where('id', $id)->first(self::COLUMNS);

        return $row === null ? null : $this->candidate($row);
    }

    private function candidate(object $row): array
    {
        $status = self::STATUS[$row->status] ?? (string) $row->status;

        return [
            'id' => (int) $row->id,
            'title' => 'Momento #'.$row->id,
            'subtitle' => $status,
            'fields' => [
                ['Opinión', $row->opinion],
                ['Motivo del rechazo', $row->rejection_reason],
                ['Estado', $status],
            ],
        ];
    }
}
