<?php

namespace App\Actions\Visitor;

use App\Models\Achievement;
use App\Models\Mission;
use App\Models\Visitor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EvaluateVisitorProgressAction
{
    public function __construct(private readonly VisitorProgressQuery $progress) {}

    /**
     * @return array{achievements: list<array<string, mixed>>, missions: list<array<string, mixed>>}
     */
    public function execute(Visitor $visitor, Carbon $at): array
    {
        $unlocked = [];
        $completed = [];

        for ($pass = 0; $pass < 4; $pass++) {
            $metrics = $this->progress->metrics($visitor);
            $gained = false;

            foreach (Mission::query()->where('is_active', true)->orderBy('sort_order')->get() as $mission) {
                if ($this->already($visitor->id, 'visitor_mission_completions', 'mission_id', $mission->id)) {
                    continue;
                }
                if ($this->progress->metricFor($metrics, $mission->rule_type, $mission->rule_param) < $mission->rule_target) {
                    continue;
                }
                DB::table('visitor_mission_completions')->insert([
                    'visitor_id' => $visitor->id,
                    'mission_id' => $mission->id,
                    'completed_at' => $at,
                ]);
                $this->award($visitor->id, 'mission', $mission->id, (int) $mission->points, $at);
                $completed[] = ['code' => $mission->code, 'title' => $mission->title, 'points' => (int) $mission->points];
                $gained = true;
            }

            $metrics = $this->progress->metrics($visitor);

            foreach (Achievement::query()->where('is_active', true)->orderBy('sort_order')->get() as $achievement) {
                if ($this->already($visitor->id, 'visitor_achievements', 'achievement_id', $achievement->id)) {
                    continue;
                }
                if ($this->progress->metricFor($metrics, $achievement->rule_type, $achievement->rule_param) < $achievement->rule_target) {
                    continue;
                }
                DB::table('visitor_achievements')->insert([
                    'visitor_id' => $visitor->id,
                    'achievement_id' => $achievement->id,
                    'unlocked_at' => $at,
                ]);
                $this->award($visitor->id, 'achievement', $achievement->id, (int) $achievement->points, $at);
                $unlocked[] = ['code' => $achievement->code, 'title' => $achievement->title, 'points' => (int) $achievement->points];
                $gained = true;
            }

            if (! $gained) {
                break;
            }
        }

        return ['achievements' => $unlocked, 'missions' => $completed];
    }

    private function already(int $visitorId, string $table, string $foreign, int $id): bool
    {
        return DB::table($table)->where('visitor_id', $visitorId)->where($foreign, $id)->exists();
    }

    private function award(int $visitorId, string $sourceType, int $sourceId, int $points, Carbon $at): void
    {
        if ($points <= 0) {
            return;
        }

        $exists = DB::table('visitor_point_entries')
            ->where('visitor_id', $visitorId)
            ->where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('visitor_point_entries')->insert([
            'visitor_id' => $visitorId,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'points' => $points,
            'created_at' => $at,
        ]);
    }
}
