<?php

namespace Tests\Feature\Visitor;

use App\Models\Visitor;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureProgressTest extends VisitorFeatureTestCase
{
    use BuildsEnclosureFixtures;

    private function progress(string $token): array
    {
        return $this->withVisitorToken($token)->getJson('/api/v1/visitor/progress')->assertOk()->json('data');
    }

    /** CA-35 enclosure-status-and-global-search */
    public function test_ca35_closed_enclosure_species_leave_total_and_numerator(): void
    {
        $account = $this->verifiedVisitor();
        $token = $account['access_token'];
        $visitor = Visitor::query()->where('email', $account['email'])->firstOrFail();
        $baseline = $this->progress($token);

        $open = $this->makeEnclosure();
        $closed = $this->makeEnclosure();
        $gone = $this->makeEnclosure();
        $mixed = $this->makeEnclosure(['is_active' => 0]);
        $speciesOpen = $this->makeSpeciesId();
        $speciesClosed = $this->makeSpeciesId();
        $speciesGone = $this->makeSpeciesId();
        $speciesMixed = $this->makeSpeciesId();
        $this->makeAnimal($open, $speciesOpen);
        $this->makeAnimal($closed, $speciesClosed);
        $this->makeAnimal($gone, $speciesGone);
        $this->makeAnimal($mixed, $speciesMixed);
        $this->makeAnimal($open, $speciesMixed); // activa en un recinto abierto: sigue contando
        $qr = $this->makeQr($open);
        $qrId = DB::table('enclosure_qr_codes')->where('code', $qr)->value('id');

        foreach ([$speciesOpen, $speciesClosed, $speciesGone, $speciesMixed] as $species) {
            DB::table('visitor_collections')->insert([
                'visitor_id' => $visitor->id, 'species_id' => $species, 'enclosure_qr_code_id' => $qrId,
                'discovered_at' => now(), 'created_at' => now(),
            ]);
        }

        $closed->forceFill(['is_active' => false])->save();
        $gone->delete();

        $after = $this->progress($token);
        // Total: +2 (abierta y mixta); cerradas y eliminadas no cuentan. Numerador igual.
        $this->assertSame($baseline['total_species'] + 2, $after['total_species']);
        $this->assertSame($baseline['discovered_species'] + 2, $after['discovered_species']);
        $this->assertLessThanOrEqual($after['total_species'], $after['discovered_species']);
        $this->assertSame(4, DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count());

        // Reactivación: vuelve a contar.
        $closed->forceFill(['is_active' => true])->save();
        $reactivated = $this->progress($token);
        $this->assertSame($baseline['total_species'] + 3, $reactivated['total_species']);
        $this->assertSame($baseline['discovered_species'] + 3, $reactivated['discovered_species']);
    }
}
