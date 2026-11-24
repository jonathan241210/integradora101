<?php

namespace Tests\Feature\Visitor;

use App\Actions\Admin\Enclosures\DeleteEnclosureAction;
use App\Models\Visitor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureScanTest extends VisitorFeatureTestCase
{
    use BuildsEnclosureFixtures;

    private const MESSAGE = 'Este recinto no está disponible en este momento.';

    private function visitor(): array
    {
        $account = $this->verifiedVisitor();

        return [$account['access_token'], Visitor::query()->where('email', $account['email'])->firstOrFail()];
    }

    private function scan(string $code): array
    {
        return ['code' => $code, 'scanned_at' => now()->toIso8601String(), 'client_scan_id' => (string) Str::uuid()];
    }

    private function assertNothingRecorded(Visitor $visitor): void
    {
        $this->assertSame(0, DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count());
        $this->assertSame(0, DB::table('visitor_point_entries')->where('visitor_id', $visitor->id)->count());
    }

    /** CA-17 enclosure-status-and-global-search */
    public function test_ca17_inactive_enclosure_qr_rejected_without_discovery(): void
    {
        [$token, $visitor] = $this->visitor();
        $enclosure = $this->makeEnclosure(['is_active' => 0]);
        $this->makeAnimal($enclosure);
        $code = $this->makeQr($enclosure);
        $scan = $this->scan($code);

        $first = $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $scan)
            ->assertUnprocessable()
            ->assertJsonPath('data.message', self::MESSAGE)
            ->assertJsonPath('data.code', 'inactive_enclosure');
        $this->assertNothingRecorded($visitor);
        $this->assertSame('inactive_enclosure', DB::table('visitor_scans')->where('visitor_id', $visitor->id)->value('result'));

        // Reintento del mismo escaneo: misma respuesta.
        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $scan)
            ->assertUnprocessable()
            ->assertJsonPath('data.message', self::MESSAGE)
            ->assertJsonPath('data.code', $first->json('data.code'));
        $this->assertNothingRecorded($visitor);
    }

    /** CA-18 enclosure-status-and-global-search */
    public function test_ca18_deleted_enclosure_qr_rejected_without_discovery(): void
    {
        [$token, $visitor] = $this->visitor();
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $code = $this->makeQr($enclosure);
        // api-020 RN-16: al eliminar el recinto sus códigos se eliminan lógicamente; el escaneo responde invalid_code (api-020 CA-20).
        app(DeleteEnclosureAction::class)->execute($enclosure);

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))
            ->assertUnprocessable()
            ->assertJsonPath('data.code', 'invalid_code')
            ->assertJsonPath('data.message', 'El código no es válido.');
        $this->assertNothingRecorded($visitor);
    }

    /** CA-19 enclosure-status-and-global-search */
    public function test_ca19_reactivated_qr_discovers_again(): void
    {
        [$token, $visitor] = $this->visitor();
        $enclosure = $this->makeEnclosure(['is_active' => 0]);
        $this->makeAnimal($enclosure, $this->makeSpeciesId(['is_published' => true]));
        $code = $this->makeQr($enclosure);

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))->assertUnprocessable();

        $enclosure->is_active = true;
        $enclosure->save();

        $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))
            ->assertCreated()->assertJsonPath('data.result', 'discovered');
        $this->assertSame(1, DB::table('visitor_collections')->where('visitor_id', $visitor->id)->count());
    }

    /** CA-20 enclosure-status-and-global-search */
    public function test_ca20_rejection_reveals_no_enclosure_data(): void
    {
        [$token] = $this->visitor();
        $enclosure = $this->makeEnclosure(['name' => 'Secreto '.bin2hex(random_bytes(4)), 'is_active' => 0]);
        $speciesId = $this->makeSpeciesId(['common_name' => 'Especie reservada '.bin2hex(random_bytes(3))]);
        $this->makeAnimal($enclosure, $speciesId);
        $code = $this->makeQr($enclosure);

        $body = $this->withVisitorToken($token)->postJson('/api/v1/visitor/discoveries', $this->scan($code))
            ->assertUnprocessable()->getContent();

        $this->assertStringNotContainsString($enclosure->name, $body);
        $this->assertStringNotContainsString($code, $body);
        $this->assertStringNotContainsString('Especie reservada', $body);
        $decoded = json_decode($body, true);
        $this->assertSame([], $decoded['data']['new_species']);
        $this->assertSame([], $decoded['data']['already_known_species']);
    }
}
