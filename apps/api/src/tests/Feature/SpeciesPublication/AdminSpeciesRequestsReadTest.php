<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use Illuminate\Support\Facades\Storage;

class AdminSpeciesRequestsReadTest extends SpeciesPublicationTestCase
{
    /** CA-05 */
    public function test_ca05_admin_lists_requests_paginated_without_photo(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $photo = $this->putMedia('species-requests');

        $unpublished = $this->makeUnpublishedSpecies(['common_name' => 'Despublicada', 'category' => 'bird']);
        $first = $this->makeRequest($unpublished, $vet, SpeciesRequestStatus::Rejected, ['request_type' => SpeciesRequestType::Update, 'category' => 'fish', 'scientific_name' => 'Corregido']);
        $second = $this->makeRequest($this->makeSpecies(['common_name' => 'Nueva', 'category' => 'mammal']), $vet, SpeciesRequestStatus::Submitted, ['image_path' => $photo]);
        $deleted = $this->makeRequest($this->makeSpecies(), $vet);
        $deleted->delete();
        $first->forceFill(['created_at' => now()->subMinute()])->save();

        $response = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk();
        $rows = $response->json('data');

        // arca_pruebas holds fixture rows from other sessions: only the newest rows are ours.
        $this->assertSame([$second->id, $first->id], array_slice(array_column($rows, 'id'), 0, 2));
        $this->assertNotContains($deleted->id, array_column($rows, 'id'));
        $this->assertSame(
            ['category', 'common_name', 'created_at', 'id', 'publication_status', 'request_type', 'scientific_name', 'species_id', 'status', 'veterinarian_name'],
            collect($rows[0])->keys()->sort()->values()->all(),
        );
        $this->assertSame('not_published', $rows[0]['publication_status']);
        $this->assertSame('mammal', $rows[0]['category']);
        $this->assertSame($vet->full_name, $rows[0]['veterinarian_name']);
        $this->assertSame('fish', $rows[1]['category']);
        $this->assertSame('Corregido', $rows[1]['scientific_name']);
        $this->assertSame('unpublished', $rows[1]['publication_status']);
        $this->assertStringNotContainsString('species-requests/', $response->getContent());
        $this->assertStringNotContainsString('image', $response->getContent());

        $filtered = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'?status=rejected')->assertOk()->json('data');
        $this->assertContains($first->id, array_column($filtered, 'id'));
        $this->assertNotContains($second->id, array_column($filtered, 'id'));
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'?status=bogus')->assertStatus(422)->assertJsonPath('message', 'Estado no válido.');
    }

    /** CA-05 */
    public function test_ca05_list_is_paginated_ten_per_page(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();

        $ids = [];
        for ($i = 0; $i < 11; $i++) {
            $ids[] = $this->makeRequest($this->makeSpecies(), $vet)->id;
        }
        $ids = array_reverse($ids);

        $page1 = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS)->assertOk();
        $this->assertCount(10, $page1->json('data'));
        $this->assertSame(array_slice($ids, 0, 10), array_column($page1->json('data'), 'id'));
        $this->assertTrue($page1->json('meta.has_more'));

        $page2 = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'?page=2')->assertOk();
        $this->assertSame($ids[10], $page2->json('data.0.id'));
    }

    /** CA-06 */
    public function test_ca06_detail_shows_current_and_proposed_without_photo_url(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();
        $species = $this->makePublishedSpecies([
            'common_name' => 'León',
            'scientific_name' => 'Panthera leo',
            'habitat' => 'Sabana',
            'distribution' => 'África',
            'category' => 'mammal',
        ]);
        $photo = $this->putMedia('species-requests', 'pending-bytes');
        $request = $this->makeRequest($species, $vet, SpeciesRequestStatus::Submitted, [
            'request_type' => SpeciesRequestType::Update,
            'habitat' => 'Pradera',
            'origin' => 'Zoológico de origen',
            'image_path' => $photo,
            'published_fields' => ['habitat'],
        ]);

        $response = $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$request->id)->assertOk();

        $response->assertJsonPath('id', $request->id)
            ->assertJsonPath('species_id', $species->id)
            ->assertJsonPath('status', 'submitted')
            ->assertJsonPath('request_type', 'update')
            ->assertJsonPath('veterinarian_name', $vet->full_name)
            ->assertJsonPath('published_fields', ['habitat'])
            ->assertJsonPath('current.common_name', 'León')
            ->assertJsonPath('current.habitat', 'Sabana')
            ->assertJsonPath('current.origin', 'África')
            ->assertJsonPath('current.is_published', true)
            ->assertJsonPath('current.publication_status', 'published')
            ->assertJsonPath('current.has_image', true)
            ->assertJsonPath('proposed.habitat', 'Pradera')
            ->assertJsonPath('proposed.origin', 'Zoológico de origen')
            ->assertJsonPath('proposed.scientific_name', 'Panthera leo')
            ->assertJsonPath('proposed.category', 'mammal')
            ->assertJsonPath('proposed.published_fields', ['habitat'])
            ->assertJsonPath('proposed.has_new_photo', true);

        $this->assertStringNotContainsString($photo, $response->getContent());
        $this->assertStringNotContainsString('http', $response->getContent());

        $binary = $this->actAs($admin)->get(self::ADMIN_REQUESTS.'/'.$request->id.'/image')->assertOk();
        $this->assertSame('pending-bytes', $binary->streamedContent());
        $this->assertSame('nosniff', $binary->headers->get('X-Content-Type-Options'));

        $noPhoto = $this->makeRequest($this->makeSpecies(), $vet);
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$noPhoto->id)->assertOk()->assertJsonPath('proposed.has_new_photo', false);
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$noPhoto->id.'/image')->assertNotFound();
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/999999999')->assertNotFound()->assertJsonPath('message', 'Solicitud no encontrada.');

        Storage::disk('media')->delete($photo);
        $this->actAs($admin)->getJson(self::ADMIN_REQUESTS.'/'.$request->id.'/image')->assertNotFound();
    }
}
