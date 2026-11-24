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
use RuntimeException;

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

    /** CA-09 visitor-progress: el logro de un animal no se confunde con otro nombre. */
    public function test_ca09_species_keyword_matches_a_whole_word(): void
    {
        [$token] = $this->visitor();
        Achievement::query()->updateOrCreate(['code' => 'comic-tigre'], [
            'title' => 'Un tigre... ¿poniendo un huevo?',
            'description' => 'Escanea un tigre.',
            'icon' => 'pets',
            'points' => 50,
            'rule_type' => 'species_keyword',
            'rule_target' => 1,
            'rule_param' => 'tigre',
            'sort_order' => 27,
            'is_active' => true,
        ]);
        Achievement::query()->updateOrCreate(['code' => 'comic-leon'], [
            'title' => 'El de la melena',
            'description' => 'Escanea un león.',
            'icon' => 'pets',
            'points' => 50,
            'rule_type' => 'species_keyword',
            'rule_target' => 1,
            'rule_param' => 'leon',
            'sort_order' => 28,
            'is_active' => true,
        ]);

        $this->placeSpecies('mammal', 'León africano');
        $tiger = $this->placeSpecies('mammal', 'Tigre de Bengala');
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($tiger))->assertCreated();
        $chameleon = $this->placeSpecies('reptile', 'Camaleón');
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($chameleon))->assertCreated();

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/achievements')
            ->assertOk()
            ->assertJsonFragment(['code' => 'comic-tigre', 'state' => 'unlocked'])
            ->assertJsonFragment(['code' => 'comic-leon', 'state' => 'pending']);
    }

    /** CA-09 visitor-progress: un descubrimiento anterior desbloquea el logro al consultarlo. */
    public function test_ca09_already_discovered_species_unlocks_keyword_achievement(): void
    {
        [$token, $visitor] = $this->visitor();
        $placement = $this->placeSpeciesWithDetails('mammal', 'Jaguar');
        DB::table('visitor_collections')->insert([
            'visitor_id' => $visitor->id,
            'species_id' => $placement['species']->id,
            'enclosure_qr_code_id' => $placement['qr']->id,
            'discovered_at' => now(),
        ]);
        $achievement = Achievement::query()->updateOrCreate(['code' => 'comic-jaguar'], [
            'title' => 'Manchas con motor',
            'description' => 'Escanea un jaguar.',
            'icon' => 'pets',
            'points' => 50,
            'rule_type' => 'species_keyword',
            'rule_target' => 1,
            'rule_param' => 'jaguar',
            'sort_order' => 34,
            'is_active' => true,
        ]);

        $rejectAward = true;
        DB::connection()->beforeExecuting(function (string $sql, array $bindings) use (&$rejectAward, $visitor, $achievement): void {
            if ($rejectAward && str_starts_with($sql, 'insert into `visitor_point_entries`')
                && array_slice($bindings, 0, 3) === [$visitor->id, 'achievement', $achievement->id]) {
                throw new RuntimeException('Fallo simulado al otorgar los puntos.');
            }
        });

        $this->withoutExceptionHandling();
        try {
            $this->withVisitorToken($token)->getJson('/api/v1/visitor/achievements');
            $this->fail('Se esperaba el fallo al otorgar los puntos.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Fallo simulado al otorgar los puntos.', $exception->getMessage());
        } finally {
            $rejectAward = false;
            $this->withExceptionHandling();
        }

        $this->assertDatabaseMissing('visitor_achievements', [
            'visitor_id' => $visitor->id,
            'achievement_id' => $achievement->id,
        ]);

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/achievements')
            ->assertOk()
            ->assertJsonFragment(['code' => 'comic-jaguar', 'state' => 'unlocked', 'progress' => 1]);
        $this->withVisitorToken($token)->getJson('/api/v1/visitor/progress')->assertOk();
        $entries = DB::table('visitor_point_entries')
            ->where('visitor_id', $visitor->id)
            ->where('source_type', 'achievement')
            ->where('source_id', $achievement->id)
            ->pluck('points');
        $this->assertCount(1, $entries);
        $this->assertSame(50, (int) $entries->first());
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

    /** CA-14 visitor-progress */
    public function test_ca14_visitor_progress_empty_enclosure_is_not_already_discovered(): void
    {
        [$token, $visitor] = $this->visitor();
        $enclosure = Model::unguarded(fn () => Enclosure::query()->create(['name' => 'Recinto vacío '.Str::random(6)]));
        $code = 'ARCA-'.Str::upper(Str::random(8));
        EnclosureQrCode::query()->create([
            'enclosure_id' => $enclosure->id,
            'code' => $code,
            'is_active' => true,
        ]);

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))
            ->assertOk()
            ->assertJsonPath('data.result', 'empty_enclosure')
            ->assertJsonPath('data.message', 'Este recinto no tiene animales en exhibición.')
            ->assertJsonPath('data.points_awarded', 0);

        $this->assertSame(0, DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count());
        $this->assertSame(0, DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)->count());

        $species = Model::unguarded(fn () => Species::query()->create([
            'common_name' => 'Especie '.Str::random(6),
            'scientific_name' => 'Scientificus test',
            'category' => 'mammal',
            'distribution' => 'México',
            'conservation_status' => 'Preocupación menor',
            'habitat' => 'Selva',
            'gestation_period' => '90 días',
            'size_cm' => '120',
            'model_3d_path' => 'models/test.glb',
        ]));
        Model::unguarded(fn () => Animal::query()->create([
            'species_id' => $species->id,
            'enclosure_id' => $enclosure->id,
            'entry_date' => now()->toDateString(),
            'stay_status' => 'Permanente',
            'can_receive_visits' => 1,
        ]));

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))
            ->assertCreated()
            ->assertJsonPath('data.result', 'discovered');
    }

    /** CA-13 visitor-progress */
    public function test_ca13_visitor_progress_suite_names_every_criterion(): void
    {
        $this->assertSame('arca_pruebas', DB::getDatabaseName());
        $contents = file_get_contents(__FILE__);
        foreach (range(1, 18) as $number) {
            $this->assertStringContainsString(sprintf('CA-%02d visitor-progress', $number), $contents);
        }
    }

    /** CA-15 visitor-progress: las misiones sin logro equivalente requieren una especie visitable. */
    public function test_ca15_unpaired_keyword_missions_list_only_visitable_species(): void
    {
        [$token] = $this->visitor();
        $suffix = Str::lower(Str::random(8));
        $goals = $this->keywordGoals('leon'.$suffix);
        $goals['achievements']->update(['rule_target' => 2]);
        $this->placeSpecies('reptile', 'Camaleón'.$suffix);
        $placement = $this->placeSpeciesWithDetails('mammal', 'León'.$suffix.' africano');

        foreach ([
            [$placement['species'], 'is_published', false, true],
            [$placement['animal'], 'can_receive_visits', false, true],
            [$placement['enclosure'], 'is_active', false, true],
            [$placement['species'], 'deleted_at', now(), null],
            [$placement['animal'], 'deleted_at', now(), null],
            [$placement['enclosure'], 'deleted_at', now(), null],
        ] as [$model, $field, $hidden, $visible]) {
            $model->forceFill([$field => $hidden])->save();
            $this->withVisitorToken($token)->getJson('/api/v1/visitor/missions')
                ->assertOk()
                ->assertJsonMissing(['code' => $goals['missions']->code]);
            $model->forceFill([$field => $visible])->save();
        }

        $placement['qr']->update(['is_active' => false]);
        foreach ($goals as $path => $goal) {
            $this->withVisitorToken($token)->getJson('/api/v1/visitor/'.$path)
                ->assertOk()
                ->assertJsonFragment(['code' => $goal->code, 'state' => 'pending', 'progress' => 0]);
        }
    }

    /** CA-16 y CA-19 visitor-progress: solo cuenta el descubrimiento visitable y se conserva lo acreditado. */
    public function test_ca16_keyword_goals_accredit_visitable_discoveries_once(): void
    {
        [$token, $visitor] = $this->visitor();
        $keyword = 'ardilla'.Str::lower(Str::random(8));
        $goals = $this->keywordGoals($keyword);
        $discovered = $this->placeSpeciesWithDetails('mammal', $keyword.' gris');
        $other = $this->placeSpeciesWithDetails('mammal', $keyword.' roja');
        $discovered['species']->update(['is_published' => false]);
        DB::table('visitor_collections')->insert([
            'visitor_id' => $visitor->id,
            'species_id' => $discovered['species']->id,
            'enclosure_qr_code_id' => $discovered['qr']->id,
            'discovered_at' => now(),
            'created_at' => now(),
        ]);
        foreach ($goals as $path => $goal) {
            $this->withVisitorToken($token)->getJson('/api/v1/visitor/'.$path)
                ->assertOk()
                ->assertJsonFragment(['code' => $goal->code, 'state' => 'pending', 'progress' => 0]);
        }

        $discovered['species']->update(['is_published' => true]);
        $this->withVisitorToken($token)->getJson('/api/v1/visitor/progress')->assertOk();
        $this->assertDatabaseHas('visitor_achievements', [
            'visitor_id' => $visitor->id, 'achievement_id' => $goals['achievements']->id,
        ]);
        $this->assertDatabaseHas('visitor_mission_completions', [
            'visitor_id' => $visitor->id, 'mission_id' => $goals['missions']->id,
        ]);

        $discovered['species']->update(['is_published' => false]);
        $states = ['achievements' => 'unlocked', 'missions' => 'completed'];
        foreach ($goals as $path => $goal) {
            $this->withVisitorToken($token)->getJson('/api/v1/visitor/'.$path)
                ->assertOk()
                ->assertJsonFragment(['code' => $goal->code, 'state' => $states[$path], 'progress' => 0]);
        }
        $other['species']->update(['is_published' => false]);
        $this->withVisitorToken($token)->getJson('/api/v1/visitor/missions')
            ->assertOk()
            ->assertJsonFragment(['code' => $goals['missions']->code, 'state' => 'completed', 'progress' => 0]);
        $this->withVisitorToken($token)->getJson('/api/v1/visitor/achievements')
            ->assertOk()
            ->assertJsonFragment(['code' => $goals['achievements']->code, 'state' => 'unlocked', 'progress' => 0]);

        $discovered['species']->update(['is_published' => true]);
        foreach ($goals as $path => $goal) {
            $this->withVisitorToken($token)->getJson('/api/v1/visitor/'.$path)
                ->assertOk()
                ->assertJsonFragment(['code' => $goal->code, 'state' => $states[$path], 'progress' => 1]);
            $points = DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)
                ->where('source_type', Str::singular($path))->where('source_id', $goal->id)
                ->pluck('points')->map(intval(...))->all();
            $this->assertSame([50], $points);
        }
    }

    /** CA-17 visitor-progress */
    public function test_ca17_mixed_enclosure_awards_only_public_visitable_species_once(): void
    {
        [$token, $visitor] = $this->visitor();
        $first = $this->placeSpeciesWithDetails('mammal', 'Jaguar mexicano');
        $second = $this->placeSpeciesWithDetails('bird', 'Águila real');
        $private = $this->placeSpeciesWithDetails('reptile', 'Cocodrilo de pantano');
        $private['species']->update(['is_published' => false]);
        $closed = $this->placeSpeciesWithDetails('mammal');
        $closed['animal']->update(['can_receive_visits' => false]);
        $removed = $this->placeSpeciesWithDetails('mammal');
        $removedSpecies = $this->placeSpeciesWithDetails('mammal');
        $removedSpecies['species']->delete();

        foreach ([$second, $private, $closed, $removed, $removedSpecies] as $placement) {
            $placement['animal']->update(['enclosure_id' => $first['enclosure']->id]);
        }
        $removed['animal']->delete();
        $first['animal']->replicate()->save();

        $scan = $this->scan($first['qr']->code);
        $response = $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $scan)
            ->assertCreated()
            ->assertJsonPath('data.points_awarded', 200)
            ->assertJsonCount(2, 'data.new_species')
            ->assertJsonFragment(['common_name' => 'Jaguar mexicano'])
            ->assertJsonFragment(['common_name' => 'Águila real']);
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $scan)
            ->assertCreated()
            ->assertJsonPath('data.new_species', $response->json('data.new_species'));
        $this->assertSame(2, DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count());
    }

    /** CA-18 visitor-progress */
    public function test_ca18_shows_all_catalog_achievements_and_keeps_earned_records(): void
    {
        [$token, $visitor] = $this->visitor();
        Achievement::query()->update(['is_active' => false]);
        $this->seed(AchievementSeeder::class);
        $first = Achievement::query()->where('code', 'mission-starter')->firstOrFail();
        DB::table('visitor_achievements')->insert([
            'visitor_id' => $visitor->id,
            'achievement_id' => $first->id,
            'unlocked_at' => now(),
        ]);
        $first->update(['is_active' => false]);
        $this->seed(AchievementSeeder::class);
        $this->assertSame(24, Achievement::query()->where('is_active', true)->count());
        $goals = $this->keywordGoals('sincoincidencia'.Str::lower(Str::random(8)));

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/achievements')
            ->assertOk()
            ->assertJsonCount(25, 'data')
            ->assertJsonFragment(['code' => 'mission-starter', 'state' => 'unlocked'])
            ->assertJsonFragment(['code' => 'mission-master', 'state' => 'pending'])
            ->assertJsonFragment(['code' => $goals['achievements']->code, 'state' => 'pending']);
        $this->assertDatabaseMissing('visitor_point_entries', ['visitor_id' => $visitor->id]);
    }

    /** CA-19 visitor-progress: una misión asociada aparece aunque no haya una especie visitable. */
    public function test_ca19_shows_pending_missions_with_matching_active_achievements(): void
    {
        [$token, $visitor] = $this->visitor();
        $goals = $this->keywordGoals('ausente'.Str::lower(Str::random(8)));
        $inactive = $this->keywordGoals('inactivo'.Str::lower(Str::random(8)));
        $inactive['achievements']->update(['is_active' => false]);

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/missions')
            ->assertOk()
            ->assertJsonFragment(['code' => $goals['missions']->code, 'state' => 'pending', 'progress' => 0])
            ->assertJsonMissing(['code' => $inactive['missions']->code]);
        $this->assertDatabaseMissing('visitor_point_entries', ['visitor_id' => $visitor->id]);
    }

    /**
     * @return array{0: string, 1: Visitor}
     */
    private function visitor(): array
    {
        $visitor = Visitor::query()->create([
            'email' => $this->visitorEmail(),
            'first_name' => 'Ana',
            'nickname' => 'Anita',
            'password' => 'secreta12',
            'avatar_code' => 'jaguar',
            'is_active' => true,
            'email_verified_at' => now(),
            'adult_confirmed_at' => now(),
            'privacy_notice_version' => '2026-10',
            'privacy_accepted_at' => now(),
        ]);
        $token = $visitor->createToken('progress-test', ['visitor'])->plainTextToken;

        return [$token, $visitor];
    }

    private function placeSpecies(string $category, ?string $commonName = null): string
    {
        return $this->placeSpeciesWithDetails($category, $commonName)['qr']->code;
    }

    /** @return array{species: Species, enclosure: Enclosure, animal: Animal, qr: EnclosureQrCode} */
    private function placeSpeciesWithDetails(string $category, ?string $commonName = null): array
    {
        $species = Model::unguarded(fn () => Species::query()->create([
            'common_name' => $commonName ?? ('Especie '.Str::random(6)),
            'scientific_name' => 'Scientificus test',
            'category' => $category,
            'distribution' => 'México',
            'conservation_status' => 'Preocupación menor',
            'habitat' => 'Selva',
            'gestation_period' => '90 días',
            'size_cm' => '120',
            'model_3d_path' => 'models/test.glb',
            'is_published' => true,
        ]));
        $enclosure = Model::unguarded(fn () => Enclosure::query()->create(['name' => 'Recinto '.Str::random(6)]));
        $animal = Model::unguarded(fn () => Animal::query()->create([
            'species_id' => $species->id,
            'enclosure_id' => $enclosure->id,
            'entry_date' => now()->toDateString(),
            'stay_status' => 'Permanente',
            'can_receive_visits' => 1,
        ]));
        $code = 'ARCA-'.Str::upper(Str::random(8));
        $qr = EnclosureQrCode::query()->create([
            'enclosure_id' => $enclosure->id,
            'code' => $code,
            'is_active' => true,
        ]);

        return ['species' => $species, 'enclosure' => $enclosure, 'animal' => $animal, 'qr' => $qr];
    }

    /** @return array{achievements: Achievement, missions: Mission} */
    private function keywordGoals(string $keyword): array
    {
        $attributes = [
            'code' => 'test-'.$keyword,
            'title' => 'Encuentra una especie',
            'description' => 'Escanea su recinto.',
            'icon' => 'pets',
            'points' => 50,
            'rule_type' => 'species_keyword',
            'rule_target' => 1,
            'rule_param' => $keyword,
            'sort_order' => 99,
            'is_active' => true,
        ];

        return [
            'achievements' => Achievement::query()->create($attributes),
            'missions' => Mission::query()->create($attributes + ['objective' => 'Descubre la especie.']),
        ];
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
