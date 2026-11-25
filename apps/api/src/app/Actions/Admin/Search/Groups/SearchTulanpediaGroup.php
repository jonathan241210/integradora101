<?php

namespace App\Actions\Admin\Search\Groups;

use Illuminate\Support\Facades\DB;

class SearchTulanpediaGroup extends SearchGroup
{
    private const SPECIES_COLUMNS = ['s.common_name', 's.scientific_name', 's.category', 's.habitat', 's.distribution', 's.conservation_status'];

    public function section(): string
    {
        return 'tulanpedia';
    }

    public function label(): string
    {
        return 'Zoopedia';
    }

    public function permission(): string
    {
        return 'species.review';
    }

    /** Dos fuentes (publicadas y solicitudes `submitted`); el tope de CA-46 se aplica a cada una. */
    protected function candidates(): array
    {
        $published = DB::table('species as s')
            ->whereNull('s.deleted_at')
            ->where('s.is_published', 1)
            ->orderByDesc('s.id')
            ->limit($this->candidateLimit)
            ->get(array_merge(['s.id'], self::SPECIES_COLUMNS))
            ->map(fn (object $row): array => $this->candidate($row, 'Publicada', 'published-species'))
            ->all();

        // Solo `submitted` (accionables); los campos son los de la especie (CA-30).
        $requests = DB::table('species_publication_requests as r')
            ->join('species as s', 's.id', '=', 'r.species_id')
            ->whereNull('r.deleted_at')
            ->where('r.status', 'submitted')
            ->orderByDesc('r.id')
            ->limit($this->candidateLimit)
            ->get(array_merge(['r.id'], self::SPECIES_COLUMNS))
            ->map(fn (object $row): array => $this->candidate($row, 'Solicitud · Enviada', 'species-request'))
            ->all();

        return array_merge($published, $requests);
    }

    private function candidate(object $row, string $subtitle, string $kind): array
    {
        return [
            'id' => (int) $row->id,
            'title' => (string) $row->common_name,
            'subtitle' => $subtitle,
            'kind' => $kind,
            'fields' => [
                [null, (string) $row->common_name],
                ['Nombre científico', $row->scientific_name],
                ['Categoría', $row->category],
                ['Hábitat', $row->habitat],
                ['Distribución', $row->distribution],
                ['Estado de conservación', $row->conservation_status],
            ],
        ];
    }
}
