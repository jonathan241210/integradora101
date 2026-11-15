<?php

namespace Tests\Feature\SpeciesPublication;

use Illuminate\Support\Facades\Storage;

class AdminPublishedSpeciesTest extends SpeciesPublicationTestCase
{
    /** CA-40 */
    public function test_ca40_admin_lists_published_and_unpublished_species_and_serves_image(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $photo = $this->putMedia('species', 'published-bytes');
        $future = now()->addYear();

        $published = $this->makePublishedSpecies(['common_name' => 'Publicada', 'category' => 'bird', 'image_path' => $photo, 'published_at' => $future->copy()->addDay()]);
        $unpublished = $this->makeUnpublishedSpecies(['common_name' => 'Despublicada', 'category' => 'fish', 'published_at' => $future]);
        $never = $this->makeSpecies(['common_name' => 'Nunca publicada']);
        $deleted = $this->makePublishedSpecies(['published_at' => $future->copy()->addDays(2)]);
        $deleted->delete();
        $this->makeRequest($published, $vet);

        $response = $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED)->assertOk();
        $rows = $response->json('data');
        $ids = array_column($rows, 'id');

        // arca_pruebas may hold other rows; ours carry the newest published_at.
        $this->assertSame([$published->id, $unpublished->id], array_slice($ids, 0, 2));
        $this->assertNotContains($never->id, $ids);
        $this->assertNotContains($deleted->id, $ids);
        $this->assertSame(
            ['category', 'common_name', 'has_image', 'has_pending_request', 'id', 'published_at', 'scientific_name', 'status', 'unpublished_at'],
            collect($rows[0])->keys()->sort()->values()->all(),
        );
        $this->assertSame('published', $rows[0]['status']);
        $this->assertTrue($rows[0]['has_image']);
        $this->assertTrue($rows[0]['has_pending_request']);
        $this->assertSame('unpublished', $rows[1]['status']);
        $this->assertFalse($rows[1]['has_pending_request']);
        $this->assertNotNull($rows[1]['unpublished_at']);
        $this->assertStringNotContainsString('species/', $response->getContent());

        $onlyUnpublished = $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED.'?status=unpublished')->json('data');
        $this->assertSame($unpublished->id, $onlyUnpublished[0]['id']);
        $this->assertNotContains($published->id, array_column($onlyUnpublished, 'id'));

        $onlyFish = $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED.'?category=fish')->json('data');
        $this->assertSame($unpublished->id, $onlyFish[0]['id']);
        $this->assertNotContains($published->id, array_column($onlyFish, 'id'));

        $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED.'?category=dragon')->assertStatus(422)->assertJsonPath('message', 'Tipo de animal no válido.');
        $this->actAs($admin)->getJson(self::ADMIN_PUBLISHED.'?status=pending')->assertStatus(422);

        $binary = $this->actAs($admin)->get(self::ADMIN_SPECIES.'/'.$published->id.'/image')->assertOk();
        $this->assertSame('published-bytes', $binary->streamedContent());
        $this->actAs($admin)->getJson(self::ADMIN_SPECIES.'/'.$never->id.'/image')->assertNotFound();

        Storage::disk('media')->delete($photo);
        $this->actAs($admin)->getJson(self::ADMIN_SPECIES.'/'.$published->id.'/image')->assertNotFound();
        $this->actAs($admin)->getJson(self::ADMIN_SPECIES.'/'.$deleted->id.'/image')->assertNotFound();
    }
}
