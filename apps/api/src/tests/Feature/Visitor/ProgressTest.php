<?php

namespace Tests\Feature\Visitor;

use App\Models\Achievement;
use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use App\Models\Mission;
use App\Models\Species;
use App\Models\Visitor;
use Database\Seeders\AchievementSeeder;
use Database\Seeders\MissionSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProgressTest extends VisitorFeatureTestCase
{
    /** CA-01 visitor-progress */
    public function test_ca01_visitor_progress_discovery_is_idempotent(): void
    {
        [$token, $visitor] = $this->visitor();
        $code = $this->placeSpecies('mammal');
        $scan = $this->scan($code);

        $first = $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $scan)->assertCreated();
        $points = DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)->count();
        $second = $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $scan)->assertCreated();

        $this->assertSame($first->json('data.result'), $second->json('data.result'));
        $this->assertSame($points, DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)->count());
        $this->assertSame(1, DB::table('visitor_scans')->where('visitor_id', $visitor->id)->count());
    }

    /** CA-02 visitor-progress */
    public function test_ca02_visitor_progress_rejects_expired_scan(): void
    {
        [$token, $visitor] = $this->visitor();

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan('NADA', now()->subHours(25)->toIso8601String()))
            ->assertStatus(422)
            ->assertJsonPath('data.result', 'expired_scan');

        $this->assertSame('expired_scan', DB::table('visitor_scans')->where('visitor_id', $visitor->id)->value('result'));
    }

    /** CA-03 visitor-progress */
    public function test_ca03_visitor_progress_limits_scans_per_minute(): void
    {
        [$token, $visitor] = $this->visitor();
        for ($index = 0; $index < 30; $index++) {
            DB::table('visitor_scans')->insert([
                'visitor_id' => $visitor->id,
                'client_scan_id' => (string) Str::uuid(),
                'submitted_code' => 'X',
                'enclosure_qr_code_id' => null,
                'scanned_at' => now(),
                'received_at' => now(),
                'result' => 'invalid_code',
            ]);
        }

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan('OTRO'))
            ->assertStatus(429)
            ->assertJsonPath('message', 'Espera 60 segundos e inténtalo de nuevo.');
    }

    /** CA-04 visitor-progress */
    public function test_ca04_visitor_progress_awards_points_per_new_species(): void
    {
        [$token, $visitor] = $this->visitor();
        $code = $this->placeSpecies('mammal');

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertCreated();

        $this->assertSame(100, (int) DB::table('visitor_point_entries')
            ->where('visitor_id', $visitor->id)
            ->where('source_type', 'species_discovery')
            ->value('points'));
        $this->assertSame(1, DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count());
    }

    /** CA-05 visitor-progress */
    public function test_ca05_visitor_progress_discovery_response_shape(): void
    {
        [$token] = $this->visitor();
        $code = $this->placeSpecies('mammal');

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))
            ->assertCreated()
            ->assertJsonStructure(['data' => [
                'result', 'new_species', 'already_known_species', 'points_awarded',
                'unlocked_achievements', 'completed_missions', 'progress',
            ]]);

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan('no-existe'))
            ->assertStatus(422)
            ->assertJsonPath('code', 'invalid_code');
    }

    /** CA-06 visitor-progress */
    public function test_ca06_visitor_progress_show(): void
    {
        [$token] = $this->visitor();
        $code = $this->placeSpecies('mammal');
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertCreated();

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/progress')
            ->assertOk()
            ->assertJsonPath('data.discovered_species', 1)
            ->assertJsonPath('data.rank', 'Explorador novato');
        $this->assertGreaterThanOrEqual(1, $this->withVisitorToken($token)->getJson('/api/v1/visitor/progress')->json('data.total_species'));
    }

    /** CA-07 visitor-progress */
    public function test_ca07_visitor_progress_collection(): void
    {
        [$token] = $this->visitor();
        $code = $this->placeSpecies('mammal');
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertCreated();

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/collection')
            ->assertOk()
            ->assertJsonFragment(['discovered' => true]);
    }

    /** CA-08 visitor-progress */
    public function test_ca08_visitor_progress_achievements_and_missions(): void
    {
        [$token] = $this->visitor();
        $this->seedCatalogs();
        $code = $this->placeSpecies('mammal');
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertCreated();

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/achievements')
            ->assertOk()
            ->assertJsonFragment(['code' => 'first-discovery', 'state' => 'unlocked']);
        $this->withVisitorToken($token)->getJson('/api/v1/visitor/missions')
            ->assertOk()
            ->assertJsonFragment(['code' => 'safari-morning', 'state' => 'pending']);
    }

    /** CA-09 visitor-progress */
    public function test_ca09_visitor_progress_rules_and_ledger_are_unique(): void
    {
        [$token, $visitor] = $this->visitor();
        Achievement::query()->updateOrCreate(['code' => 'one-enclosure'], [
            'title' => 'Un recinto', 'description' => 'Un recinto', 'icon' => 'explore', 'points' => 10,
            'rule_type' => 'enclosure_count', 'rule_target' => 1, 'rule_param' => null, 'sort_order' => 9, 'is_active' => true,
        ]);
        Achievement::query()->updateOrCreate(['code' => 'one-bird'], [
            'title' => 'Un ave', 'description' => 'Un ave', 'icon' => 'visibility', 'points' => 10,
            'rule_type' => 'category_species_count', 'rule_target' => 1, 'rule_param' => 'bird', 'sort_order' => 10, 'is_active' => true,
        ]);
        Mission::query()->updateOrCreate(['code' => 'one-mission'], [
            'title' => 'Una', 'description' => 'Una', 'objective' => 'Una especie', 'icon' => 'pets', 'points' => 5,
            'rule_type' => 'species_count', 'rule_target' => 1, 'rule_param' => null, 'sort_order' => 9, 'is_active' => true,
        ]);

        $code = $this->placeSpecies('bird');
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertCreated();
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertOk();

        $this->assertSame(1, DB::table('visitor_achievements')->where('visitor_id', $visitor->id)->where('achievement_id', Achievement::query()->where('code', 'one-enclosure')->value('id'))->count());
        $this->assertSame(1, DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)->where('source_type', 'species_discovery')->count());
    }

    /** CA-10 visitor-progress */
    public function test_ca10_visitor_progress_level_thresholds(): void
    {
        [$token, $visitor] = $this->visitor();
        DB::table('visitor_point_entries')->insert([
            'visitor_id' => $visitor->id,
            'source_type' => 'species_discovery',
            'source_id' => 900001,
            'points' => 500,
            'created_at' => now(),
        ]);

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/progress')
            ->assertOk()
            ->assertJsonPath('data.level', 2)
            ->assertJsonPath('data.rank', 'Explorador')
            ->assertJsonPath('data.next_threshold', 1500);
    }

    /** CA-11 visitor-progress */
    public function test_ca11_visitor_progress_seeders_are_idempotent(): void
    {
        $this->seedCatalogs();
        $first = Achievement::query()->count();
        $missions = Mission::query()->count();
        $this->seedCatalogs();

        $this->assertSame($first, Achievement::query()->count());
        $this->assertSame($missions, Mission::query()->count());
        $this->assertNotNull(Achievement::query()->where('code', 'first-discovery')->first());
    }

    /** CA-12 visitor-progress */
    public function test_ca12_visitor_progress_generates_opaque_qr_codes(): void
    {
        $enclosure = Model::unguarded(fn () => Enclosure::query()->create(['name' => 'Recinto secreto '.Str::random(6)]));

        Artisan::call('arca:generate-qr-codes', ['enclosure' => $enclosure->id]);
        $code = trim(Artisan::output());

        $this->assertStringStartsWith('ARCA-', $code);
        $this->assertStringNotContainsString($enclosure->name, $code);
        $this->assertNotNull(EnclosureQrCode::query()->where('code', $code)->where('is_active', true)->first());
    }

    /** CA-13 visitor-progress */
    public function test_ca13_visitor_progress_suite_names_every_criterion(): void
    {
        $this->assertSame('arca_pruebas', DB::getDatabaseName());
        $contents = file_get_contents(__FILE__);
        foreach (range(1, 13) as $number) {
            $this->assertStringContainsString(sprintf('CA-%02d visitor-progress', $number), $contents);
        }
    }

    /**
     * @return array{0: string, 1: Visitor}
     */
    private function visitor(): array
    {
        $account = $this->verifiedVisitor();

        return [$account['access_token'], Visitor::query()->where('email', $account['email'])->firstOrFail()];
    }

    private function placeSpecies(string $category): string
    {
        $species = Model::unguarded(fn () => Species::query()->create([
            'common_name' => 'Especie '.Str::random(6),
            'scientific_name' => 'Scientificus test',
            'category' => $category,
            'distribution' => 'México',
            'conservation_status' => 'Preocupación menor',
            'habitat' => 'Selva',
            'gestation_period' => '90 días',
            'size_cm' => '120',
            'model_3d_path' => 'models/test.glb',
        ]));
        $enclosure = Model::unguarded(fn () => Enclosure::query()->create(['name' => 'Recinto '.Str::random(6)]));
        Model::unguarded(fn () => Animal::query()->create([
            'species_id' => $species->id,
            'enclosure_id' => $enclosure->id,
            'entry_date' => now()->toDateString(),
            'stay_status' => 'Permanente',
            'can_receive_visits' => 1,
        ]));
        $code = 'ARCA-'.Str::upper(Str::random(8));
        EnclosureQrCode::query()->create([
            'enclosure_id' => $enclosure->id,
            'code' => $code,
            'is_active' => true,
        ]);

        return $code;
    }

    /**
     * @return array{code: string, scanned_at: string, client_scan_id: string}
     */
    private function scan(string $code, ?string $at = null): array
    {
        return [
            'code' => $code,
            'scanned_at' => $at ?? now()->toIso8601String(),
            'client_scan_id' => (string) Str::uuid(),
        ];
    }

    private function seedCatalogs(): void
    {
        $this->seed(AchievementSeeder::class);
        $this->seed(MissionSeeder::class);
    }
}
