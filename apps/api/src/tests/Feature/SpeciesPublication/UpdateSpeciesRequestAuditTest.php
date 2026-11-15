<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Models\SpeciesPublicationRequest;
use Spatie\Activitylog\Models\Activity;

class UpdateSpeciesRequestAuditTest extends SpeciesPublicationTestCase
{
    private function edits(SpeciesPublicationRequest $request)
    {
        return Activity::query()
            ->where('subject_type', SpeciesPublicationRequest::class)
            ->where('subject_id', $request->id)
            ->where('event', 'species_publication.edited');
    }

    /** CA-18 */
    public function test_ca18_edit_audit_only_when_values_change(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian());
        $url = self::ADMIN_REQUESTS.'/'.$request->id;

        $this->actAs($admin)->patchJson($url, ['habitat' => 'Sabana'])->assertOk();
        $log = $this->edits($request)->first();
        $this->assertNotNull($log);
        $this->assertSame('Solicitud de publicación editada por '.$admin->full_name, $log->description);
        $this->assertSame('admin', $log->log_name);
        $this->assertNull($log->properties['old']['habitat']);
        $this->assertSame('Sabana', $log->properties['new']['habitat']);

        // Same values again: 200 and no new audit row.
        $this->actAs($admin)->patchJson($url, ['habitat' => ' Sabana '])->assertOk();
        $this->assertSame(1, $this->edits($request)->count());
    }

    /** CA-22 */
    public function test_ca22_patch_replaces_published_fields(): void
    {
        $admin = $this->zooAdmin();
        $request = $this->makeRequest($this->makeSpecies(), $this->veterinarian());
        $url = self::ADMIN_REQUESTS.'/'.$request->id;

        $this->actAs($admin)->patchJson($url, ['published_fields' => ['habitat']])
            ->assertOk()->assertJsonPath('published_fields', ['habitat']);
        $this->assertSame(['habitat'], $request->fresh()->published_fields);

        $log = $this->edits($request)->latest('id')->first();
        $this->assertSame(['scientific_name', 'origin', 'habitat'], $log->properties['old']['published_fields']);
        $this->assertSame(['habitat'], $log->properties['new']['published_fields']);

        // Without the field the list is untouched; the same selection in another order is no change.
        $this->actAs($admin)->patchJson($url, ['origin' => 'Origen'])->assertOk()->assertJsonPath('published_fields', ['habitat']);
        $count = $this->edits($request)->count();
        $this->actAs($admin)->patchJson($url, ['published_fields' => '["habitat"]'])->assertOk();
        $this->assertSame($count, $this->edits($request)->count());

        $this->actAs($admin)->patchJson($url, ['published_fields' => []])->assertOk()->assertJsonPath('published_fields', []);
        $this->assertSame([], $request->fresh()->published_fields);
        $this->assertSame(SpeciesRequestStatus::Submitted, $request->fresh()->status);
    }
}
