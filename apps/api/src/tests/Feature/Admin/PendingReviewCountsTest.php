<?php

namespace Tests\Feature\Admin;

use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use App\Models\Species;
use Illuminate\Support\Facades\DB;

class PendingReviewCountsTest extends PendingReviewTestCase
{
    /** CA-01 pending-review-counts */
    public function test_ca01_counts_both_keys_for_both_permissions(): void
    {
        $response = $this->actAs($this->reviewer())->getJson(self::URL)->assertOk();

        $this->assertSame(['species_requests', 'memories'], array_keys($response->json()));
        $this->assertIsInt($response->json('species_requests'));
        $this->assertIsInt($response->json('memories'));
        $this->assertGreaterThanOrEqual(0, $response->json('species_requests'));
        $response->assertJsonMissingPath('data');
    }

    /** CA-02 pending-review-counts */
    public function test_ca02_only_species_key_without_memories_permission(): void
    {
        $response = $this->actAs($this->staffWith(['species.review']))->getJson(self::URL)->assertOk();

        $this->assertSame(['species_requests'], array_keys($response->json()));
    }

    /** CA-03 pending-review-counts */
    public function test_ca03_only_memories_key_without_species_permission(): void
    {
        $response = $this->actAs($this->staffWith(['memories.review']))->getJson(self::URL)->assertOk();

        $this->assertSame(['memories'], array_keys($response->json()));
    }

    /** CA-04 pending-review-counts */
    public function test_ca04_zero_when_nothing_pending(): void
    {
        // La base de pruebas puede traer pendientes: se vacía la cola dentro de la transacción de la prueba.
        DB::table('species_publication_requests')->where('status', 'submitted')->update(['deleted_at' => now()]);
        DB::table('visitor_memories')->whereIn('status', ['submitted', 'in_review'])->update(['deleted_at' => now()]);

        $this->assertSame(['species_requests' => 0, 'memories' => 0], $this->counts($this->reviewer()));
    }

    /** CA-05 pending-review-counts */
    public function test_ca05_counts_only_pending_states_and_matches_lists(): void
    {
        $user = $this->reviewer();
        $before = $this->counts($user);

        $this->makeSpeciesRequest(SpeciesRequestStatus::Submitted, SpeciesRequestType::Publish);
        $this->makeSpeciesRequest(SpeciesRequestStatus::Submitted, SpeciesRequestType::Update);
        $this->makeSpeciesRequest(SpeciesRequestStatus::Accepted);
        $this->makeSpeciesRequest(SpeciesRequestStatus::Rejected);
        $this->createMemory([], 'submitted');
        $this->createMemory([], 'in_review');
        $this->createMemory([], 'accepted');
        $this->createMemory([], 'rejected');

        $after = $this->counts($user);
        $this->assertSame($before['species_requests'] + 2, $after['species_requests']);
        $this->assertSame($before['memories'] + 2, $after['memories']);

        // Coincide con el total de los listados existentes, recorriendo páginas.
        $speciesTotal = 0;
        $page = 1;
        do {
            $list = $this->getJson('/api/v1/admin/species-publication-requests?status=submitted&page='.$page++)->assertOk();
            $speciesTotal += count($list->json('data'));
        } while ($list->json('meta.has_more'));
        $this->assertSame($speciesTotal, $after['species_requests']);

        $memoriesTotal = 0;
        foreach (['submitted', 'in_review'] as $status) {
            $page = 1;
            do {
                $list = $this->getJson("/api/v1/admin/memories?status={$status}&limit=50&page=".$page++)->assertOk();
                $memoriesTotal += count($list->json('data'));
            } while ($list->json('meta.has_more'));
        }
        $this->assertSame($memoriesTotal, $after['memories']);
    }

    /** CA-06 pending-review-counts */
    public function test_ca06_soft_deleted_rows_are_not_counted(): void
    {
        $user = $this->reviewer();
        $before = $this->counts($user);

        $request = $this->makeSpeciesRequest(SpeciesRequestStatus::Submitted);
        $memory = $this->createMemory([], 'submitted');
        $inReview = $this->createMemory([], 'in_review');
        $this->assertSame($before['species_requests'] + 1, $this->counts($user)['species_requests']);
        $this->assertSame($before['memories'] + 2, $this->counts($user)['memories']);

        $request->delete();
        $memory->delete();
        $inReview->delete();

        $this->assertSame($before, $this->counts($user));
    }

    /** CA-08 pending-review-counts */
    public function test_ca08_response_contains_only_integer_counts(): void
    {
        $this->makeSpeciesRequest(SpeciesRequestStatus::Submitted);
        $this->createMemory(['opinion' => 'Opinión secreta de prueba'], 'submitted');

        foreach ([$this->reviewer(), $this->staffWith(['species.review']), $this->staffWith(['memories.review'])] as $user) {
            $body = $this->actAs($user)->getJson(self::URL)->assertOk()->json();

            $this->assertNotEmpty($body);
            $this->assertEmpty(array_diff(array_keys($body), ['species_requests', 'memories']));
            foreach ($body as $value) {
                $this->assertIsInt($value);
            }
        }
        $raw = $this->actAs($this->reviewer())->get(self::URL)->getContent();
        $this->assertStringNotContainsString('Opinión secreta', $raw);
        $this->assertStringNotContainsString('@', $raw);
        $this->assertStringNotContainsString('http', $raw);
    }

    /** CA-09 pending-review-counts */
    public function test_ca09_read_only_no_rows_or_activity_changed(): void
    {
        $user = $this->reviewer();
        $this->makeSpeciesRequest(SpeciesRequestStatus::Submitted);
        $this->createMemory([], 'submitted');
        $tables = ['species_publication_requests', 'species', 'visitor_memories', 'visitor_memory_reviews', 'activity_log'];
        $snapshot = fn () => array_map(fn ($t) => DB::table($t)->orderBy('id')->get()->toJson(), $tables);
        $before = $snapshot();

        $this->actAs($user)->getJson(self::URL)->assertOk();

        $this->assertSame($before, $snapshot());
    }

    /** CA-12 pending-review-counts */
    public function test_ca12_species_request_of_soft_deleted_species_is_not_counted(): void
    {
        $user = $this->reviewer();
        $before = $this->counts($user)['species_requests'];
        $species = Species::query()->create(['common_name' => 'Borrable '.bin2hex(random_bytes(3)), 'scientific_name' => 'Delete testus', 'is_published' => false]);
        $this->makeSpeciesRequest(SpeciesRequestStatus::Submitted, SpeciesRequestType::Publish, $species);
        $this->assertSame($before + 1, $this->counts($user)['species_requests']);

        $species->delete();

        $this->assertSame($before, $this->counts($user)['species_requests']);
    }

    /** CA-01, CA-02 pending-review-counts (RN-08, rol Comunicación de api-023) */
    public function test_comunicacion_sees_both_keys(): void
    {
        $response = $this->actAs($this->createAccount('communications'))->getJson(self::URL)->assertOk();

        $this->assertSame(['species_requests', 'memories'], array_keys($response->json()));
    }
}
