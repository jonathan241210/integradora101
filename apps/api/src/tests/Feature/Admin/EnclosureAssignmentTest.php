<?php

namespace Tests\Feature\Admin;

use App\Models\Enclosure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class EnclosureAssignmentTest extends FeatureTestCase
{
    use BuildsEnclosureFixtures;
    use CreatesStaffUsers;

    private function payload(int $enclosureId): array
    {
        return [
            'name' => 'Animal api-019',
            'species' => 'Especie '.bin2hex(random_bytes(5)),
            'tag_number' => 'T19-'.bin2hex(random_bytes(5)),
            'sex' => 'hembra',
            'enclosure_id' => $enclosureId,
        ];
    }

    /** CA-15 enclosure-status-and-global-search */
    public function test_ca15_staff_store_rejects_inactive_or_deleted_enclosure(): void
    {
        $staff = $this->createStaffUser('veterinarian');
        $inactive = $this->makeEnclosure(['is_active' => 0]);
        $deleted = $this->makeEnclosure();
        $deleted->delete();

        foreach ([$inactive, $deleted] as $enclosure) {
            $payload = $this->payload($enclosure->id);
            $this->actingAs($staff, 'web')->postJson('/api/v1/staff/animals', $payload)
                ->assertUnprocessable()->assertJsonValidationErrors('enclosure_id')
                ->assertJsonPath('errors.enclosure_id.0', 'Este recinto no está disponible para asignar animales.');
            $this->assertSame(0, DB::table('animals')->where('tag_number', $payload['tag_number'])->count());
        }

        $active = $this->makeEnclosure();
        $this->actingAs($staff, 'web')->postJson('/api/v1/staff/animals', $this->payload($active->id))->assertCreated();
    }

    /** CA-16 enclosure-status-and-global-search */
    public function test_ca16_every_enclosure_write_point_applies_assignable_rule(): void
    {
        // Regla única y reutilizable (RN-04).
        $inactive = $this->makeEnclosure(['is_active' => 0]);
        $active = $this->makeEnclosure();
        $check = fn (int $id) => Validator::make(['enclosure_id' => $id], ['enclosure_id' => [Enclosure::assignableRule()]])->passes();

        $this->assertTrue($check($active->id));
        $this->assertFalse($check($inactive->id));

        // Punto de escritura de referencia: POST /api/v1/staff/animals.
        $staff = $this->createStaffUser('veterinarian');
        $payload = $this->payload($inactive->id);
        $this->actingAs($staff, 'web')->postJson('/api/v1/staff/animals', $payload)->assertUnprocessable();
        $this->assertSame(0, DB::table('animals')->where('tag_number', $payload['tag_number'])->count());

        // El único punto que escribe animals.enclosure_id en la app usa la regla.
        $source = file_get_contents(base_path('app/Http/Controllers/Api/AnimalController.php'));
        $this->assertStringContainsString('Enclosure::assignableRule()', $source);
    }
}
