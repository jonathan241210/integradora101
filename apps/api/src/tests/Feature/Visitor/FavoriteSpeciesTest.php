<?php

namespace Tests\Feature\Visitor;

use App\Models\Species;
use App\Models\Visitor;
use App\Models\VisitorFavoriteSpecies;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Tests\Concerns\CreatesStaffUsers;

class FavoriteSpeciesTest extends VisitorFeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-01 */
    public function test_ca01_returns_only_that_account_newest_first(): void
    {
        $owner = $this->verifiedVisitor();
        $other = $this->verifiedVisitor();
        $ownerId = $this->account($owner)->id;
        $tieOld = $this->species();
        $tieNew = $this->species();
        $fresh = $this->species();
        $foreign = $this->species();
        $stamp = now()->subDays(2)->startOfSecond();

        $low = VisitorFavoriteSpecies::query()->create([
            'visitor_id' => $ownerId,
            'species_id' => $tieOld->id,
        ]);
        $high = VisitorFavoriteSpecies::query()->create([
            'visitor_id' => $ownerId,
            'species_id' => $tieNew->id,
        ]);
        $low->forceFill(['created_at' => $stamp, 'updated_at' => $stamp])->save();
        $high->forceFill(['created_at' => $stamp, 'updated_at' => $stamp])->save();
        VisitorFavoriteSpecies::query()->create([
            'visitor_id' => $ownerId,
            'species_id' => $fresh->id,
        ]);
        VisitorFavoriteSpecies::query()->create([
            'visitor_id' => $this->account($other)->id,
            'species_id' => $foreign->id,
        ]);

        $response = $this->withVisitorToken($owner['access_token'])
            ->getJson('/api/v1/visitor/favorite-species')
            ->assertOk();

        $rows = $response->json('data');
        $this->assertSame([$fresh->id, $tieNew->id, $tieOld->id], array_column($rows, 'id'));
        $this->assertNotContains($foreign->id, array_column($rows, 'id'));
        foreach ($rows as $row) {
            $this->assertSame(['id'], array_keys($row));
        }
        $this->assertStringNotContainsString($owner['email'], $response->getContent());
        $this->assertStringNotContainsString($fresh->common_name, $response->getContent());
    }

    /** CA-02 */
    public function test_ca02_empty_account_returns_empty_data(): void
    {
        $visitor = $this->verifiedVisitor();

        $this->withVisitorToken($visitor['access_token'])
            ->getJson('/api/v1/visitor/favorite-species')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    /** CA-03 */
    public function test_ca03_mark_is_idempotent_and_returns_the_list(): void
    {
        $visitor = $this->verifiedVisitor();
        $species = $this->species();

        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), ['favorite' => true])
            ->assertOk()
            ->assertJsonPath('data.0.id', $species->id);

        $row = VisitorFavoriteSpecies::query()->where('species_id', $species->id)->firstOrFail();
        $original = now()->subDays(4)->startOfSecond();
        $row->forceFill(['created_at' => $original, 'updated_at' => $original])->save();

        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), ['favorite' => true])
            ->assertOk()
            ->assertJsonPath('data.0.id', $species->id);

        $this->assertSame(1, VisitorFavoriteSpecies::query()->where('visitor_id', $this->account($visitor)->id)->count());
        $this->assertSame($original->getTimestamp(), $row->fresh()->created_at->getTimestamp());
    }

    /** CA-04 */
    public function test_ca04_unmark_deletes_and_unmark_missing_stays_empty(): void
    {
        $visitor = $this->verifiedVisitor();
        $species = $this->species();
        $missing = $this->species();

        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($missing), ['favorite' => false])
            ->assertOk()
            ->assertExactJson(['data' => []]);
        $this->assertSame(0, VisitorFavoriteSpecies::query()->count());

        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), ['favorite' => true])
            ->assertOk();
        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), ['favorite' => false])
            ->assertOk()
            ->assertExactJson(['data' => []]);
        $this->assertSame(0, VisitorFavoriteSpecies::query()->where('species_id', $species->id)->count());
    }

    /** CA-05 */
    public function test_ca05_hidden_species_is_not_marked_and_disappears_from_the_list(): void
    {
        $visitor = $this->verifiedVisitor();
        $token = $visitor['access_token'];
        $hidden = $this->species(false);
        $gone = $this->species();
        $gone->delete();

        $this->withVisitorToken($token)
            ->putJson('/api/v1/visitor/favorite-species/2000000000', ['favorite' => true])
            ->assertNotFound()
            ->assertJsonPath('message', 'Especie no encontrada.');
        $this->withVisitorToken($token)
            ->putJson($this->path($hidden), ['favorite' => true])
            ->assertNotFound()
            ->assertJsonPath('message', 'Especie no encontrada.');
        $this->withVisitorToken($token)
            ->putJson($this->path($gone), ['favorite' => true])
            ->assertNotFound()
            ->assertJsonPath('message', 'Especie no encontrada.');
        $this->assertSame(0, VisitorFavoriteSpecies::query()->count());

        $visible = $this->species();
        $this->withVisitorToken($token)
            ->putJson($this->path($visible), ['favorite' => true])
            ->assertOk();
        $visible->forceFill(['is_published' => false])->save();

        $this->withVisitorToken($token)
            ->getJson('/api/v1/visitor/favorite-species')
            ->assertOk()
            ->assertExactJson(['data' => []]);
        $this->assertSame(1, VisitorFavoriteSpecies::query()->where('species_id', $visible->id)->count());

        $removed = $this->species();
        $this->withVisitorToken($token)
            ->putJson($this->path($removed), ['favorite' => true])
            ->assertOk();
        $removed->delete();

        $listed = $this->withVisitorToken($token)
            ->getJson('/api/v1/visitor/favorite-species')
            ->assertOk()
            ->json('data');
        $this->assertNotContains($removed->id, array_column($listed, 'id'));
        $this->assertSame(1, VisitorFavoriteSpecies::query()->where('species_id', $removed->id)->count());
    }

    /** CA-06 */
    public function test_ca06_session_boolean_and_non_numeric_id(): void
    {
        $this->getJson('/api/v1/visitor/favorite-species')->assertUnauthorized();
        $this->putJson('/api/v1/visitor/favorite-species/1', ['favorite' => true])->assertUnauthorized();

        $email = $this->registerVisitor();
        $unverified = Visitor::query()->where('email', $email)->firstOrFail();
        $token = $unverified->createToken('phone', ['visitor'])->plainTextToken;
        $this->withVisitorToken($token)
            ->getJson('/api/v1/visitor/favorite-species')
            ->assertForbidden()
            ->assertJsonPath('code', 'email_not_verified');
        $this->withVisitorToken($token)
            ->putJson('/api/v1/visitor/favorite-species/1', ['favorite' => true])
            ->assertForbidden()
            ->assertJsonPath('code', 'email_not_verified');
        $this->assertSame(0, VisitorFavoriteSpecies::query()->count());

        $visitor = $this->verifiedVisitor();
        $species = $this->species();
        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), ['favorite' => true])
            ->assertOk();
        $createdAt = VisitorFavoriteSpecies::query()->firstOrFail()->created_at->getTimestamp();

        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), ['favorite' => 'si'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'El favorito debe ser sí o no.');
        $this->withVisitorToken($visitor['access_token'])
            ->putJson($this->path($species), [])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'El favorito debe ser sí o no.');
        $this->assertSame(1, VisitorFavoriteSpecies::query()->count());
        $this->assertSame($createdAt, VisitorFavoriteSpecies::query()->firstOrFail()->created_at->getTimestamp());

        $missing = $this->withVisitorToken($visitor['access_token'])
            ->putJson('/api/v1/visitor/favorite-species/abc', ['favorite' => true]);
        $missing->assertNotFound();
        $this->assertNotSame('Especie no encontrada.', $missing->json('message'));
        $this->assertSame(1, VisitorFavoriteSpecies::query()->count());
    }

    /** CA-07 */
    public function test_ca07_other_account_and_staff_cookie_do_not_touch_rows(): void
    {
        $owner = $this->verifiedVisitor();
        $other = $this->verifiedVisitor();
        $species = $this->species();
        $this->withVisitorToken($owner['access_token'])
            ->putJson($this->path($species), ['favorite' => true])
            ->assertOk();

        $this->withVisitorToken($other['access_token'])
            ->putJson($this->path($species), ['favorite' => false])
            ->assertOk()
            ->assertExactJson(['data' => []]);
        $this->assertSame(1, VisitorFavoriteSpecies::query()->where('visitor_id', $this->account($owner)->id)->count());

        Auth::forgetGuards();
        unset($this->defaultHeaders['Authorization']);
        $staff = $this->createStaffUser('executive');
        $this->actingAs($staff, 'web')
            ->getJson('/api/v1/visitor/favorite-species')
            ->assertForbidden();
        $this->actingAs($staff, 'web')
            ->putJson($this->path($species), ['favorite' => false])
            ->assertForbidden();
        $this->assertSame(1, VisitorFavoriteSpecies::query()->where('visitor_id', $this->account($owner)->id)->count());
    }

    /** CA-08 */
    public function test_ca08_deleting_the_account_removes_only_its_rows(): void
    {
        $owner = $this->verifiedVisitor();
        $other = $this->verifiedVisitor();
        $ownerId = $this->account($owner)->id;
        $otherId = $this->account($other)->id;
        $this->withVisitorToken($owner['access_token'])
            ->putJson($this->path($this->species()), ['favorite' => true])
            ->assertOk();
        $this->withVisitorToken($other['access_token'])
            ->putJson($this->path($this->species()), ['favorite' => true])
            ->assertOk();

        $this->withVisitorToken($owner['access_token'])
            ->deleteJson('/api/v1/visitor/me', ['password' => 'secreta12'])
            ->assertNoContent();

        $this->assertSame(0, VisitorFavoriteSpecies::query()->where('visitor_id', $ownerId)->count());
        $this->assertSame(1, VisitorFavoriteSpecies::query()->where('visitor_id', $otherId)->count());
    }

    private function account(array $visitor): Visitor
    {
        return Visitor::query()->where('email', $visitor['email'])->firstOrFail();
    }

    private function path(Species $species): string
    {
        return '/api/v1/visitor/favorite-species/'.$species->id;
    }

    private function species(bool $published = true): Species
    {
        return Species::query()->create([
            'common_name' => 'Especie '.Str::random(6),
            'scientific_name' => 'Scientificus test',
            'category' => 'mammal',
            'distribution' => 'México',
            'conservation_status' => 'Preocupación menor',
            'habitat' => 'Selva',
            'gestation_period' => '90 días',
            'size_cm' => '120',
            'model_3d_path' => 'models/test.glb',
            'is_published' => $published,
            'published_at' => $published ? now() : null,
        ]);
    }
}
