<?php

namespace Tests\Feature\Admin;

use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Spatie\Permission\PermissionRegistrar;
use Tests\Concerns\CreatesMemoryFixtures;

/** Base común de api-024: usuarios con permisos directos y fixtures de solicitudes de especie. */
abstract class PendingReviewTestCase extends AdminFeatureTestCase
{
    use CreatesMemoryFixtures;

    protected const URL = '/api/v1/admin/pending-counts';

    /** @param  list<string>  $permissions */
    protected function staffWith(array $permissions): User
    {
        $user = $this->createAccount('executive');
        $user->syncRoles([]);
        $user->givePermissionTo($permissions);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user;
    }

    protected function reviewer(): User
    {
        return $this->createAccount('zoo-admin');
    }

    protected function makeSpeciesRequest(SpeciesRequestStatus $status, SpeciesRequestType $type = SpeciesRequestType::Publish, ?Species $species = null, ?User $creator = null): SpeciesPublicationRequest
    {
        $species ??= Species::query()->create([
            'common_name' => 'Especie '.bin2hex(random_bytes(4)),
            'scientific_name' => 'Scientificus testus',
            'is_published' => false,
        ]);
        $creator ??= $this->createAccount('veterinarian', false);

        $request = new SpeciesPublicationRequest([
            'species_id' => $species->id,
            'request_type' => $type,
            'published_fields' => ['scientific_name'],
            'created_by' => $creator->id,
        ]);
        $request->status = $status;
        $request->save();

        return $request->refresh();
    }

    /** @return array<string, int> */
    protected function counts(User $user): array
    {
        return $this->actAs($user)->getJson(self::URL)->assertOk()->json();
    }
}
