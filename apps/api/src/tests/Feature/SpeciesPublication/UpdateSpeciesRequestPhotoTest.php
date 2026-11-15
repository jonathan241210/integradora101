<?php

namespace Tests\Feature\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\UpdateSpeciesPublicationRequestAction;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Enums\SpeciesRequestStatus;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;

class UpdateSpeciesRequestPhotoTest extends SpeciesPublicationTestCase
{
    /** CA-23 */
    public function test_ca23_patch_replaces_photo_and_deletes_previous_after_commit(): void
    {
        $admin = $this->zooAdmin();
        $old = $this->putMedia('species-requests');
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), SpeciesRequestStatus::Submitted, ['image_path' => $old]);
        $url = self::ADMIN_REQUESTS.'/'.$request->id;

        // multipart with _method=PATCH (R6)
        $this->actAs($admin)->post($url, ['_method' => 'PATCH', 'image' => $this->jpeg()], ['Accept' => 'application/json'])
            ->assertOk()->assertJsonPath('proposed.has_new_photo', true);

        $new = $request->fresh()->image_path;
        $this->assertNotSame($old, $new);
        $this->assertStringStartsWith('species-requests/', $new);
        Storage::disk('media')->assertExists($new);
        Storage::disk('media')->assertMissing($old);

        $log = Activity::query()->where('subject_id', $request->id)->where('event', 'species_publication.photo_replaced')->first();
        $this->assertSame('Foto de solicitud de publicación reemplazada por '.$admin->full_name, $log->description);
        $this->assertStringNotContainsString('species-requests', json_encode($log->properties));

        // JSON PATCH without a file keeps the photo.
        $this->actAs($admin)->patchJson($url, ['habitat' => 'Sabana'])->assertOk();
        $this->assertSame($new, $request->fresh()->image_path);

        // Unprocessable file: 422 and nothing changes.
        $this->actAs($admin)->post($url, ['_method' => 'PATCH', 'image' => $this->corruptImage()], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', 'No se pudo procesar la foto. Intenta con otro archivo.');
        $this->assertSame($new, $request->fresh()->image_path);
        $this->assertCount(1, Storage::disk('media')->allFiles());

        // A request already reviewed: 422 and the new photo is removed.
        $done = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), SpeciesRequestStatus::Rejected);
        $this->actAs($admin)->post(self::ADMIN_REQUESTS.'/'.$done->id, ['_method' => 'PATCH', 'image' => $this->jpeg()], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', 'Esta solicitud ya fue revisada.');
        $this->assertCount(1, Storage::disk('media')->allFiles());
    }

    /** CA-23 */
    public function test_ca23_failed_transaction_removes_new_photo_keeps_previous(): void
    {
        $admin = $this->zooAdmin();
        $old = $this->putMedia('species-requests');
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian(), SpeciesRequestStatus::Submitted, ['image_path' => $old]);

        $this->mock(LogSpeciesPublicationAction::class, function ($mock): void {
            $mock->shouldReceive('execute')->andThrow(new RuntimeException('audit failed'));
        });

        try {
            app(UpdateSpeciesPublicationRequestAction::class)->execute($admin, $request->id, [], null, $this->jpeg());
            $this->fail('The action should rethrow the failure.');
        } catch (RuntimeException $e) {
            $this->assertSame('audit failed', $e->getMessage());
        }

        $this->assertSame([$old], Storage::disk('media')->allFiles());
        $this->assertSame($old, $request->fresh()->image_path);
    }
}
