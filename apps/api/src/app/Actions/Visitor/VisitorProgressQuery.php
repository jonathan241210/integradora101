<?php

namespace App\Actions\Visitor;

use App\Models\Achievement;
use App\Models\Mission;
use App\Models\Visitor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class VisitorProgressQuery
{
    /**
     * @return array{points: int, level: int, rank: string, next_threshold: int|null, discovered_species: int, total_species: int}
     */
    public function progress(Visitor $visitor): array
    {
        $points = (int) DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)->sum('points');
        $level = $this->level($points);
        $discovered = DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count();

        return [
            'points' => $points,
            'level' => $level['level'],
            'rank' => $level['rank'],
            'next_threshold' => $level['next_threshold'],
            'discovered_species' => $discovered,
            'total_species' => $this->availableSpeciesCount(),
        ];
    }

    /**
     * @return array{level: int, rank: string, next_threshold: int|null}
     */
    public function level(int $points): array
    {
        $levels = collect(config('visitor_progress.levels'))->sortBy('threshold')->values();
        $current = $levels->first();
        $next = null;

        foreach ($levels as $index => $level) {
            if ($points >= (int) $level['threshold']) {
                $current = $level;
                $next = $levels->get($index + 1);
            }
        }

        return [
            'level' => (int) $current['level'],
            'rank' => (string) $current['rank'],
            'next_threshold' => $next === null ? null : (int) $next['threshold'],
        ];
    }

    /**
     * @return list<array{id: int, common_name: string, category: string|null, discovered: bool, discovered_at: string|null}>
     */
    public function collection(Visitor $visitor): array
    {
        $discovered = DB::table('visitor_collections')
            ->where('visitor_id', $visitor->id)
            ->get()
            ->keyBy('species_id');

        return DB::table('species')
            ->orderBy('common_name')
            ->get(['id', 'common_name', 'category'])
            ->map(function (object $species) use ($discovered): array {
                $row = $discovered->get($species->id);

                return [
                    'id' => (int) $species->id,
                    'common_name' => (string) $species->common_name,
                    'category' => $species->category,
                    'discovered' => $row !== null,
                    'discovered_at' => $row === null ? null : Carbon::parse($row->discovered_at)->toIso8601String(),
                ];
            })
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function achievements(Visitor $visitor): array
    {
        return $this->catalog(Achievement::query()->where('is_active', true)->orderBy('sort_order')->get(), $visitor, 'visitor_achievements', 'achievement_id', 'unlocked_at');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function missions(Visitor $visitor): array
    {
        return $this->catalog(Mission::query()->where('is_active', true)->orderBy('sort_order')->get(), $visitor, 'visitor_mission_completions', 'mission_id', 'completed_at', true);
    }

    public function availableSpeciesCount(): int
    {
        return (int) DB::table('species')
            ->whereIn('id', function ($query): void {
                $query->select('animals.species_id')
                    ->from('animals')
                    ->join('enclosure_qr_codes', 'enclosure_qr_codes.enclosure_id', '=', 'animals.enclosure_id')
                    ->where('animals.can_receive_visits', 1)
                    ->where('enclosure_qr_codes.is_active', 1);
            })
            ->count();
    }

    /**
     * @param  Collection<int, Achievement|Mission>  $rows
     * @return list<array<string, mixed>>
     */
    private function catalog(Collection $rows, Visitor $visitor, string $table, string $foreign, string $when, bool $mission = false): array
    {
        $owned = DB::table($table)->where('visitor_id', $visitor->id)->get()->keyBy($foreign);
        $metrics = $this->metrics($visitor);

        return $rows->map(function (Achievement|Mission $row) use ($owned, $foreign, $when, $mission, $metrics): array {
            $hit = $owned->get($row->id);
            $current = $this->metricFor($metrics, $row->rule_type, $row->rule_param);

            $payload = [
                'code' => $row->code,
                'title' => $row->title,
                'description' => $row->description,
                'icon' => $row->icon,
                'points' => (int) $row->points,
                'rule_type' => $row->rule_type,
                'rule_target' => (int) $row->rule_target,
                'progress' => min($current, (int) $row->rule_target),
                'state' => $hit === null ? 'pending' : ($mission ? 'completed' : 'unlocked'),
                'earned_at' => $hit === null ? null : Carbon::parse($hit->{$when})->toIso8601String(),
            ];

            if ($mission && $row instanceof Mission) {
                $payload['objective'] = $row->objective;
            }

            return $payload;
        })->all();
    }

    /**
     * @return array{species_count: int, enclosure_count: int, missions_completed: int, categories: array<string, int>}
     */
    public function metrics(Visitor $visitor): array
    {
        $speciesCount = DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count();
        $enclosureCount = DB::table('visitor_collections')
            ->join('enclosure_qr_codes', 'enclosure_qr_codes.id', '=', 'visitor_collections.enclosure_qr_code_id')
            ->where('visitor_collections.visitor_id', $visitor->id)
            ->whereNotNull('enclosure_qr_codes.enclosure_id')
            ->distinct()
            ->count('enclosure_qr_codes.enclosure_id');
        $missions = DB::table('visitor_mission_completions')->where('visitor_id', $visitor->id)->count();
        $categories = DB::table('visitor_collections')
            ->join('species', 'species.id', '=', 'visitor_collections.species_id')
            ->where('visitor_collections.visitor_id', $visitor->id)
            ->whereNotNull('species.category')
            ->select('species.category', DB::raw('count(*) as total'))
            ->groupBy('species.category')
            ->pluck('total', 'category')
            ->all();

        return [
            'species_count' => $speciesCount,
            'enclosure_count' => $enclosureCount,
            'missions_completed' => $missions,
            'categories' => $categories,
        ];
    }

    /**
     * @param  array{species_count: int, enclosure_count: int, missions_completed: int, categories: array<string, int>}  $metrics
     */
    public function metricFor(array $metrics, string $ruleType, ?string $ruleParam): int
    {
        return match ($ruleType) {
            'species_count' => $metrics['species_count'],
            'enclosure_count' => $metrics['enclosure_count'],
            'missions_completed' => $metrics['missions_completed'],
            'category_species_count' => (int) ($metrics['categories'][$ruleParam] ?? 0),
            default => 0,
        };
    }
}
