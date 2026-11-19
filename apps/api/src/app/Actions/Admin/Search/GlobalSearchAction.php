<?php

namespace App\Actions\Admin\Search;

use App\Actions\Admin\Search\Groups\SearchEnclosuresGroup;
use App\Actions\Admin\Search\Groups\SearchEventsGroup;
use App\Actions\Admin\Search\Groups\SearchGroup;
use App\Actions\Admin\Search\Groups\SearchMemoriesGroup;
use App\Actions\Admin\Search\Groups\SearchNewsGroup;
use App\Actions\Admin\Search\Groups\SearchTicketHistoryGroup;
use App\Actions\Admin\Search\Groups\SearchTulanpediaGroup;
use App\Actions\Admin\Search\Groups\SearchUsersGroup;
use App\Models\User;

/** Búsqueda global de solo lectura (api-019, CA-21 a CA-49). No recibe logger ni escribe: el término no se registra (CA-49). */
class GlobalSearchAction
{
    /** El tope de candidatos por grupo es inyectable para las pruebas (CA-46). */
    public function __construct(private readonly int $candidateLimit = SearchGroup::CANDIDATE_LIMIT) {}

    /**
     * @return list<array{section: string, label: string, best_score: int, items: list<array<string, mixed>>}>
     */
    public function execute(User $user, string $term): array
    {
        $groups = [];

        // Orden de RN-07.
        foreach ($this->definitions() as $group) {
            if (! $user->can($group->permission())) {
                continue;
            }

            $ranked = $group->rank($term);

            if ($ranked['items'] !== []) {
                $groups[] = [
                    'section' => $group->section(),
                    'label' => $group->label(),
                    'best_score' => $ranked['best_score'],
                    'items' => $ranked['items'],
                ];
            }
        }

        return $groups;
    }

    /**
     * @return list<SearchGroup>
     */
    private function definitions(): array
    {
        return [
            new SearchUsersGroup($this->candidateLimit),
            new SearchNewsGroup($this->candidateLimit),
            new SearchEventsGroup($this->candidateLimit),
            new SearchEnclosuresGroup($this->candidateLimit),
            new SearchMemoriesGroup($this->candidateLimit),
            new SearchTulanpediaGroup($this->candidateLimit),
            new SearchTicketHistoryGroup($this->candidateLimit),
        ];
    }
}
