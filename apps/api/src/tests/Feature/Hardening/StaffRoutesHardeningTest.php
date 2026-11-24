<?php

namespace Tests\Feature\Hardening;

use App\Models\Animal;
use App\Models\Department;
use App\Models\Enclosure;
use App\Models\Species;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

/** api-028 · permisos y límite en /staff/* (CA-03 a CA-06). */
class StaffRoutesHardeningTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-03 pre-delivery-hardening */
    public function test_ca03_staff_reads_require_medical_records_view(): void
    {
        $user = $this->staffWithoutMedicalRecords();

        $animalId = $this->createAnimalId();

        foreach (['animals', "animals/{$animalId}", 'sync/bootstrap', 'sync/changes'] as $path) {
            $this->actingAs($user, 'web')->getJson('/api/v1/staff/'.$path)->assertForbidden();
        }
    }

    /** CA-04 pre-delivery-hardening */
    public function test_ca04_staff_writes_require_medical_records_create(): void
    {
        $user = $this->staffWithoutMedicalRecords();

        $animalId = $this->createAnimalId();

        foreach (['animals', "animals/{$animalId}/photo", 'clinical-evaluations', 'sync/operations'] as $path) {
            $this->actingAs($user, 'web')->postJson('/api/v1/staff/'.$path, [])->assertForbidden();
        }
    }

    /** CA-05 pre-delivery-hardening */
    public function test_ca05_veterinarian_with_permissions_still_uses_staff_routes(): void
    {
        $vet = $this->createStaffUser('veterinarian');

        $this->actingAs($vet, 'web')->getJson('/api/v1/staff/animals')->assertOk();
        $this->actingAs($vet, 'web')->getJson('/api/v1/staff/sync/bootstrap')->assertOk();
        $this->actingAs($vet, 'web')->getJson('/api/v1/staff/sync/changes')->assertOk();
        $this->actingAs($vet, 'web')->postJson('/api/v1/staff/animals', [])->assertUnprocessable();
        $this->actingAs($vet, 'web')->postJson('/api/v1/staff/clinical-evaluations', [])->assertUnprocessable();
        $this->actingAs($vet, 'web')->postJson('/api/v1/staff/sync/operations', [])->assertUnprocessable();
        $this->actingAs($vet, 'web')->getJson('/api/v1/staff/auth/session')->assertOk();
    }

    /** CA-06 pre-delivery-hardening */
    public function test_ca06_staff_routes_return_429_above_the_configured_limit(): void
    {
        config(['arca.staff_api_limit' => 3]);
        $vet = $this->createStaffUser('veterinarian');

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($vet, 'web')->getJson('/api/v1/staff/animals')->assertOk();
        }

        $this->actingAs($vet, 'web')->getJson('/api/v1/staff/animals')
            ->assertStatus(429)
            ->assertJsonPath('message', 'Demasiadas solicitudes. Intenta de nuevo en unos instantes.');
    }

    private function createAnimalId(): int
    {
        $enclosure = Enclosure::query()->create(['name' => 'Recinto perm '.bin2hex(random_bytes(4))]);
        $species = Species::query()->create(['common_name' => 'Especie perm '.bin2hex(random_bytes(4)), 'scientific_name' => 'Permus testus']);

        return Animal::query()->create([
            'tag_number' => 'PERM-'.bin2hex(random_bytes(4)),
            'responsible_id' => 1,
            'name' => 'Animal perm',
            'sex' => 'F',
            'enclosure_id' => $enclosure->id,
            'species_id' => $species->id,
            'stay_status' => 'Permanente',
            'entry_date' => now()->toDateString(),
        ])->id;
    }

    private function staffWithoutMedicalRecords(): User
    {
        $user = $this->createStaffUser('executive');
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->assertFalse($user->can('medical-records.view'));
        $this->assertFalse($user->can('medical-records.create'));
        $this->assertInstanceOf(Role::class, Role::findByName('executive', 'web'));
        $this->assertInstanceOf(Department::class, $user->department);

        return $user;
    }
}
