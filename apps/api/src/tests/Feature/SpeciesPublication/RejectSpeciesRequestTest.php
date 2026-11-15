<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

class RejectSpeciesRequestTest extends SpeciesPublicationTestCase
{
    /** CA-09 */
    public function test_ca09_late_decision_returns_422(): void
    {
        $admin = $this->zooAdmin();
        $vet = $this->veterinarian();

        foreach ([SpeciesRequestStatus::Accepted, SpeciesRequestStatus::Rejected] as $status) {
            $request = $this->makeRequest($this->makeSpecies(), $vet, $status);

            $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/reject', ['rejection_reason' => 'Tarde'])
                ->assertStatus(422)->assertJsonPath('message', 'Esta solicitud ya fue revisada.');
            $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/accept')
                ->assertStatus(422)->assertJsonPath('message', 'Esta solicitud ya fue revisada.');
            $this->assertSame($status, $request->fresh()->status);
        }
    }

    /** CA-10 */
    public function test_ca10_reject_deletes_photo_and_keeps_species_unchanged(): void
    {
        $admin = $this->zooAdmin();
        $photo = $this->putMedia('species-requests');
        $species = $this->makePublishedSpecies(['common_name' => 'León']);
        $before = $species->only(['is_published', 'published_at', 'unpublished_at', 'image_path', 'published_fields', 'category']);
        $request = $this->makeRequest($species, $this->veterinarian(), SpeciesRequestStatus::Submitted, ['image_path' => $photo, 'category' => 'bird']);

        $this->actAs($admin)->postJson(self::ADMIN_REQUESTS.'/'.$request->id.'/reject', ['rejection_reason' => '  Foto borrosa  '])
            ->assertOk()->assertJsonPath('status', 'rejected')->assertJsonPath('rejection_reason', 'Foto borrosa');

        $fresh = $request->fresh();
        $this->assertSame(SpeciesRequestStatus::Rejected, $fresh->status);
        $this->assertSame($admin->id, $fresh->reviewed_by);
        $this->assertNotNull($fresh->reviewed_at);
        $this->assertNull($fresh->image_path);
        Storage::disk('media')->assertMissing($photo);
        $this->assertEquals($before, $species->fresh()->only(array_keys($before)));

        $log = Activity::query()->where('subject_id', $request->id)->where('event', 'species_publication.rejected')->first();
        $this->assertSame('Solicitud de publicación rechazada: Foto borrosa', $log->description);
    }

    /** CA-11 */
    public function test_ca11_reject_requires_reason_1_to_500(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian());
        $url = self::ADMIN_REQUESTS.'/'.$request->id.'/reject';

        foreach ([[], ['rejection_reason' => ''], ['rejection_reason' => '   '], ['rejection_reason' => str_repeat('a', 501)]] as $payload) {
            $this->actAs($admin)->postJson($url, $payload)->assertStatus(422)
                ->assertJsonPath('message', 'Motivo requerido (1-500 caracteres).');
        }
        $this->assertSame(SpeciesRequestStatus::Submitted, $request->fresh()->status);

        $this->actAs($admin)->postJson($url, ['rejection_reason' => str_repeat('ñ', 500)])->assertOk();
        $this->assertSame(500, mb_strlen($request->fresh()->rejection_reason));
    }
}
