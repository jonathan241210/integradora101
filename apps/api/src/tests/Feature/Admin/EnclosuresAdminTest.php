<?php

namespace Tests\Feature\Admin;

use App\Models\Enclosure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

class EnclosuresAdminTest extends AdminFeatureTestCase
{
    private function enclosureWithAnimals(string $name, int $animals): Enclosure
    {
        $enclosure = Enclosure::query()->forceCreate(['name' => $name]);
        $speciesId = DB::table('species')->insertGetId(['common_name' => 'Especie '.bin2hex(random_bytes(4))]);

        for ($i = 0; $i < $animals; $i++) {
            DB::table('animals')->insert([
                'name' => 'Animal '.$i,
                'entry_date' => '2026-01-01',
                'enclosure_id' => $enclosure->id,
                'species_id' => $speciesId,
            ]);
        }

        return $enclosure;
    }

    /** CA-17 */
    public function test_ca17_administration_management_lists_enclosures_with_animal_count_without_n_plus_one(): void
    {
        $admin = $this->createAccount('admin');
        $first = $this->enclosureWithAnimals('Aviario '.bin2hex(random_bytes(4)), 2);

        $queries = fn () => (function () use ($admin) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $response = $this->actAs($admin)->getJson('/api/v1/admin/enclosures')->assertOk();
            $count = collect(DB::getQueryLog())->filter(fn ($q) => str_contains($q['query'], 'enclosures') || str_contains($q['query'], 'animals'))->count();
            DB::disableQueryLog();

            return [$response, $count];
        })();

        [$response, $baseline] = $queries();
        $row = collect($response->json('data'))->firstWhere('id', $first->id);
        $this->assertSame(2, $row['animals_count']);
        $this->assertSame($first->name, $row['name']);

        $this->enclosureWithAnimals('Reptilario '.bin2hex(random_bytes(4)), 3);
        $this->enclosureWithAnimals('Estanque '.bin2hex(random_bytes(4)), 1);
        [, $afterGrowth] = $queries();

        $this->assertSame($baseline, $afterGrowth);
    }

    /** CA-18 */
    public function test_ca18_administration_management_creates_renames_and_rejects_duplicates_without_delete_route(): void
    {
        $admin = $this->createAccount('admin');
        $name = 'Sabana '.bin2hex(random_bytes(4));

        $created = $this->actAs($admin)->postJson('/api/v1/admin/enclosures', ['name' => $name])
            ->assertCreated()->assertJsonPath('data.name', $name)->assertJsonPath('data.animals_count', 0);
        $id = $created->json('data.id');

        $this->actAs($admin)->postJson('/api/v1/admin/enclosures', ['name' => mb_strtoupper($name)])
            ->assertUnprocessable()->assertJsonValidationErrors('name')
            ->assertJsonPath('errors.name.0', 'Ya existe un recinto con ese nombre.');
        $this->actAs($admin)->postJson('/api/v1/admin/enclosures', ['name' => ''])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->actAs($admin)->postJson('/api/v1/admin/enclosures', ['name' => str_repeat('a', 101)])->assertUnprocessable();

        $this->actAs($admin)->patchJson("/api/v1/admin/enclosures/{$id}", ['name' => mb_strtoupper($name)])
            ->assertOk()->assertJsonPath('data.name', mb_strtoupper($name));

        $other = Enclosure::query()->forceCreate(['name' => 'Otro '.bin2hex(random_bytes(4))]);
        $this->actAs($admin)->patchJson("/api/v1/admin/enclosures/{$other->id}", ['name' => $name])->assertUnprocessable();
        $this->actAs($admin)->patchJson('/api/v1/admin/enclosures/999999999', ['name' => 'Inexistente '.bin2hex(random_bytes(4))])
            ->assertNotFound();

        $this->assertFalse(Route::has('admin.enclosures.destroy'));
        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$id}")->assertStatus(405);
        $this->assertNotNull(Enclosure::query()->find($id));
    }
}
