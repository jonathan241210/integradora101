<?php

namespace App\Actions\Visitor;

use App\Models\EnclosureQrCode;
use App\Models\Species;
use App\Models\Visitor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RecordVisitorDiscoveryAction
{
    public function __construct(
        private readonly VisitorProgressQuery $progress,
        private readonly EvaluateVisitorProgressAction $evaluate,
    ) {}

    /**
     * @param  array{code: string, scanned_at: string, client_scan_id: string}  $input
     * @return array{status: int, body: array<string, mixed>}
     */
    public function execute(Visitor $visitor, array $input): array
    {
        return DB::transaction(function () use ($visitor, $input): array {
            $existing = DB::table('visitor_scans')
                ->where('visitor_id', $visitor->id)
                ->where('client_scan_id', $input['client_scan_id'])
                ->first();

            if ($existing !== null) {
                return $this->replay($visitor, $existing);
            }

            $recent = DB::table('visitor_scans')
                ->where('visitor_id', $visitor->id)
                ->where('received_at', '>=', now()->subMinute())
                ->count();

            if ($recent >= 30) {
                return [
                    'status' => 429,
                    'body' => ['message' => 'Espera 60 segundos e inténtalo de nuevo.'],
                ];
            }

            $scannedAt = Carbon::parse($input['scanned_at']);
            $receivedAt = now();

            if ($scannedAt->lt($receivedAt->copy()->subHours(24)) || $scannedAt->gt($receivedAt->copy()->addMinutes(5))) {
                return $this->reject($visitor, $input, null, 'expired_scan', 'El escaneo ya no es válido.', $scannedAt, $receivedAt);
            }

            $qr = EnclosureQrCode::query()->where('code', $input['code'])->first();

            if ($qr === null) {
                return $this->reject($visitor, $input, null, 'invalid_code', 'El código no es válido.', $scannedAt, $receivedAt);
            }

            if (! $qr->is_active) {
                return $this->reject($visitor, $input, $qr->id, 'inactive_code', 'El código no está activo.', $scannedAt, $receivedAt);
            }

            $speciesIds = DB::table('animals')
                ->where('enclosure_id', $qr->enclosure_id)
                ->where('can_receive_visits', 1)
                ->distinct()
                ->pluck('species_id');

            $known = DB::table('visitor_collections')->where('visitor_id', $visitor->id)->pluck('species_id');
            $newIds = $speciesIds->diff($known)->values();
            $alreadyIds = $speciesIds->intersect($known)->values();
            $pointsEach = (int) config('visitor_progress.points_per_species');

            foreach ($newIds as $speciesId) {
                DB::table('visitor_collections')->insert([
                    'visitor_id' => $visitor->id,
                    'species_id' => $speciesId,
                    'enclosure_qr_code_id' => $qr->id,
                    'discovered_at' => $receivedAt,
                    'created_at' => $receivedAt,
                ]);
                DB::table('visitor_point_entries')->insert([
                    'visitor_id' => $visitor->id,
                    'source_type' => 'species_discovery',
                    'source_id' => $speciesId,
                    'points' => $pointsEach,
                    'created_at' => $receivedAt,
                ]);
            }

            $awards = $newIds->isEmpty()
                ? ['achievements' => [], 'missions' => []]
                : $this->evaluate->execute($visitor, $receivedAt);

            $result = $newIds->isEmpty() ? 'already_discovered' : 'discovered';
            $this->storeScan($visitor, $input, $qr->id, $result, $scannedAt, $receivedAt);

            return [
                'status' => $result === 'discovered' ? 201 : 200,
                'body' => $this->payload(
                    $visitor,
                    $result,
                    $this->speciesRows($newIds->all()),
                    $this->speciesRows($alreadyIds->all()),
                    $newIds->count() * $pointsEach,
                    $awards['achievements'],
                    $awards['missions'],
                ),
            ];
        });
    }

    /**
     * @param  array{code: string, scanned_at: string, client_scan_id: string}  $input
     * @return array{status: int, body: array<string, mixed>}
     */
    private function reject(
        Visitor $visitor,
        array $input,
        ?int $qrId,
        string $result,
        string $message,
        Carbon $scannedAt,
        Carbon $receivedAt,
    ): array {
        $this->storeScan($visitor, $input, $qrId, $result, $scannedAt, $receivedAt);

        return [
            'status' => 422,
            'body' => $this->payload($visitor, $result, [], [], 0, [], [], $message),
        ];
    }

    /**
     * @param  object  $scan
     * @return array{status: int, body: array<string, mixed>}
     */
    private function replay(Visitor $visitor, object $scan): array
    {
        $receivedAt = Carbon::parse($scan->received_at);
        $newIds = DB::table('visitor_collections')
            ->where('visitor_id', $visitor->id)
            ->where('enclosure_qr_code_id', $scan->enclosure_qr_code_id)
            ->where('discovered_at', $receivedAt->toDateTimeString())
            ->pluck('species_id');
        $points = (int) DB::table('visitor_point_entries')
            ->where('visitor_id', $visitor->id)
            ->where('source_type', 'species_discovery')
            ->whereIn('source_id', $newIds->all() ?: [0])
            ->sum('points');
        $achievements = DB::table('visitor_achievements')
            ->join('achievements', 'achievements.id', '=', 'visitor_achievements.achievement_id')
            ->where('visitor_achievements.visitor_id', $visitor->id)
            ->where('visitor_achievements.unlocked_at', $receivedAt->toDateTimeString())
            ->get(['achievements.code', 'achievements.title', 'achievements.points']);
        $missions = DB::table('visitor_mission_completions')
            ->join('missions', 'missions.id', '=', 'visitor_mission_completions.mission_id')
            ->where('visitor_mission_completions.visitor_id', $visitor->id)
            ->where('visitor_mission_completions.completed_at', $receivedAt->toDateTimeString())
            ->get(['missions.code', 'missions.title', 'missions.points']);

        $status = match ($scan->result) {
            'discovered' => 201,
            'already_discovered' => 200,
            default => 422,
        };

        return [
            'status' => $status,
            'body' => $this->payload(
                $visitor,
                (string) $scan->result,
                $this->speciesRows($newIds->all()),
                [],
                $newIds->isEmpty() ? 0 : $points,
                $achievements->map(fn ($row) => ['code' => $row->code, 'title' => $row->title, 'points' => (int) $row->points])->all(),
                $missions->map(fn ($row) => ['code' => $row->code, 'title' => $row->title, 'points' => (int) $row->points])->all(),
                $status === 422 ? 'El escaneo no se pudo registrar.' : null,
            ),
        ];
    }

    /**
     * @param  array{code: string, scanned_at: string, client_scan_id: string}  $input
     */
    private function storeScan(Visitor $visitor, array $input, ?int $qrId, string $result, Carbon $scannedAt, Carbon $receivedAt): void
    {
        DB::table('visitor_scans')->insert([
            'visitor_id' => $visitor->id,
            'client_scan_id' => $input['client_scan_id'],
            'submitted_code' => $input['code'],
            'enclosure_qr_code_id' => $qrId,
            'scanned_at' => $scannedAt,
            'received_at' => $receivedAt,
            'result' => $result,
        ]);
    }

    /**
     * @param  list<int>  $ids
     * @return list<array{id: int, common_name: string}>
     */
    private function speciesRows(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        return Species::query()->whereIn('id', $ids)->orderBy('common_name')->get(['id', 'common_name'])
            ->map(fn (Species $species): array => ['id' => (int) $species->id, 'common_name' => (string) $species->common_name])
            ->all();
    }

    /**
     * @param  list<array{id: int, common_name: string}>  $newSpecies
     * @param  list<array{id: int, common_name: string}>  $knownSpecies
     * @param  list<array<string, mixed>>  $achievements
     * @param  list<array<string, mixed>>  $missions
     * @return array<string, mixed>
     */
    private function payload(
        Visitor $visitor,
        string $result,
        array $newSpecies,
        array $knownSpecies,
        int $points,
        array $achievements,
        array $missions,
        ?string $message = null,
    ): array {
        $body = [
            'result' => $result,
            'new_species' => $newSpecies,
            'already_known_species' => $knownSpecies,
            'points_awarded' => $points,
            'unlocked_achievements' => $achievements,
            'completed_missions' => $missions,
            'progress' => $this->progress->progress($visitor),
        ];

        if ($message !== null) {
            $body['message'] = $message;
            $body['code'] = $result;
        }

        return $body;
    }
}
