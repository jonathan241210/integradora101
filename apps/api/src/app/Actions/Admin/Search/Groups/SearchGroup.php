<?php

namespace App\Actions\Admin\Search\Groups;

use App\Actions\Admin\Search\Matching\ItemMatcher;
use App\Actions\Admin\Search\Matching\QueryWords;
use App\Actions\Admin\Search\Matching\TextNormalizer;

abstract class SearchGroup
{
    public const LIMIT = 5;

    /** CA-46 y RN-17: candidatos que compara cada grupo, los más recientes por id descendente. */
    public const CANDIDATE_LIMIT = 2000;

    public function __construct(protected readonly int $candidateLimit = self::CANDIDATE_LIMIT) {}

    abstract public function section(): string;

    abstract public function label(): string;

    abstract public function permission(): string;

    /**
     * Candidatos más recientes (máximo `$this->candidateLimit`), con columnas explícitas (CA-48).
     * `fields` son pares [etiqueta, texto]; etiqueta nula = título (CA-43).
     *
     * @return list<array{id: int, title: string, subtitle: string, kind?: string, fields: list<array{0: string|null, 1: string|null}>}>
     */
    abstract protected function candidates(): array;

    /** Grupos con identificador exacto (momentos y boletos, CA-29 y CA-31): el registro con ese id, fuera del tope. */
    protected function byId(int $id): ?array
    {
        return null;
    }

    protected function searchesById(): bool
    {
        return false;
    }

    /**
     * Solo lectura. Máximo LIMIT elementos: puntuación, título normalizado, `kind` e id (CA-24 y CA-41).
     *
     * @return list<array{id: int, title: string, subtitle: string, kind?: string, match?: array{field: string, snippet: string}}>
     */
    public function search(string $term): array
    {
        return $this->rank($term)['items'];
    }

    /**
     * Elementos (máx. LIMIT) y `best_score`: la relevancia del mejor elemento (CA-54; formato en ItemMatcher).
     *
     * @return array{items: list<array<string, mixed>>, best_score: int}
     */
    public function rank(string $term): array
    {
        $matcher = new ItemMatcher(QueryWords::from($term));
        $numeric = $this->searchesById() && $this->isNumericId($term) ? (int) $term : null;

        $candidates = $this->candidates();
        if ($numeric !== null && ! in_array($numeric, array_column($candidates, 'id'), true)
            && ($exact = $this->byId($numeric)) !== null) {
            $candidates[] = $exact;
        }

        $ranked = [];
        foreach ($candidates as $candidate) {
            $found = $matcher->evaluate($candidate['fields'], $candidate['title']);
            $idHit = $numeric !== null && $candidate['id'] === $numeric;

            if ($found === null && ! $idHit) {
                continue;
            }

            $item = ['id' => $candidate['id'], 'title' => $candidate['title'], 'subtitle' => $candidate['subtitle']];
            if (isset($candidate['kind'])) {
                $item['kind'] = $candidate['kind'];
            }
            if ($found !== null && $found['match'] !== null) {
                $item['match'] = $found['match'];
            }

            $ranked[] = [
                'score' => max($found['score'] ?? 0, $idHit ? ItemMatcher::ID_RELEVANCE : 0),
                'sort' => TextNormalizer::normalize($candidate['title']),
                'item' => $item,
            ];
        }

        usort($ranked, fn (array $a, array $b): int => [$b['score'], $a['sort'], $a['item']['kind'] ?? '', $a['item']['id']]
            <=> [$a['score'], $b['sort'], $b['item']['kind'] ?? '', $b['item']['id']]);

        return [
            'items' => array_map(fn (array $row): array => $row['item'], array_slice($ranked, 0, self::LIMIT)),
            'best_score' => $ranked === [] ? 0 : $ranked[0]['score'],
        ];
    }

    protected function isNumericId(string $term): bool
    {
        return ctype_digit($term) && strlen($term) <= 18;
    }
}
