<?php

namespace Tests\Feature\Visitor;

use App\Actions\Admin\Enclosures\DeleteEnclosureAction;
use App\Actions\Admin\Enclosures\RegenerateEnclosureQrAction;
use App\Actions\Visitor\VisitorProgressQuery;
use App\Models\Enclosure;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;
use Tests\Concerns\CreatesAdministrators;

class EnclosureQrLifecycleTest extends VisitorFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;
    use CreatesAdministrators;

    private string $token;

    private Visitor $visitor;

    protected function setUp(): void
    {
        parent::setUp();
        $account = $this->verifiedVisitor();
        $this->token = $account['access_token'];
        $this->visitor = Visitor::query()->where('email', $account['email'])->firstOrFail();
    }

    private function actAs(User $user): static
    {
        Auth::forgetGuards();

        return $this->actingAs($user, 'web');
    }

    private function scan(string $code, ?string $at = null)
    {
        return $this->withVisitorToken($this->token)->postJson('/api/v1/visitor/discoveries', [
            'code' => $code,
            'scanned_at' => $at ?? now()->toIso8601String(),
            'client_scan_id' => (string) Str::uuid(),
        ]);
    }

    private function regenerate(Enclosure $enclosure): string
    {
        return app(RegenerateEnclosureQrAction::class)->execute($enclosure)->qr->code;
    }

    private function counts(): array
    {
        $metrics = app(VisitorProgressQuery::class)->metrics($this->visitor);
        $progress = $this->withVisitorToken($this->token)->getJson('/api/v1/visitor/progress')->assertOk()->json('data');

        return [
            'species' => $metrics['species_count'],
            'enclosures' => $metrics['enclosure_count'],
            'points' => $progress['points'],
            'collections' => DB::table('visitor_collections')->where('visitor_id', $this->visitor->id)->count(),
            'entries' => DB::table('visitor_point_entries')->where('visitor_id', $this->visitor->id)->count(),
        ];
    }

    private function assertNothingRecorded(): void
    {
        $this->assertSame(0, DB::table('visitor_collections')->where('visitor_id', $this->visitor->id)->count());
        $this->assertSame(0, DB::table('visitor_point_entries')->where('visitor_id', $this->visitor->id)->count());
    }

    /** CA-17 enclosure-qr-management */
    public function test_ca17_escaneo_de_codigo_desactivado_responde_inactive_code(): void
    {
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $a = $this->makeQr($enclosure);
        $b = $this->regenerate($enclosure);

        $this->scan($a)->assertUnprocessable()
            ->assertJsonPath('data.code', 'inactive_code')
            ->assertJsonPath('data.message', 'El código no está activo.');
        $this->assertNothingRecorded();

        $this->scan($b)->assertCreated()->assertJsonPath('data.result', 'discovered');
    }

    /** CA-20 enclosure-qr-management */
    public function test_ca20_escaneo_de_codigo_eliminado_responde_invalid_code(): void
    {
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $code = $this->makeQr($enclosure);
        app(DeleteEnclosureAction::class)->execute($enclosure);

        $this->scan($code)->assertUnprocessable()
            ->assertJsonPath('data.code', 'invalid_code')
            ->assertJsonPath('data.message', 'El código no es válido.');
        $this->assertNothingRecorded();
    }

    /** CA-21 enclosure-qr-management */
    public function test_ca21_regenerar_conserva_progreso(): void
    {
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $this->makeAnimal($enclosure);
        $a = $this->makeQr($enclosure);
        $aId = (int) DB::table('enclosure_qr_codes')->where('code', $a)->value('id');
        $this->scan($a)->assertCreated();
        $before = $this->counts();
        $this->assertSame(2, $before['species']);

        $this->regenerate($enclosure);

        $this->assertSame($before, $this->counts());
        $this->assertSame(2, DB::table('visitor_collections')->where('visitor_id', $this->visitor->id)->where('enclosure_qr_code_id', $aId)->count());
        $this->assertSame($enclosure->id, (int) DB::table('enclosure_qr_codes')->where('id', $aId)->value('enclosure_id'));
    }

    /** CA-22 enclosure-qr-management */
    public function test_ca22_codigo_nuevo_con_especies_conocidas_responde_already_discovered(): void
    {
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $a = $this->makeQr($enclosure);
        $this->scan($a)->assertCreated();
        $before = $this->counts();

        $b = $this->regenerate($enclosure);
        $this->scan($b)->assertOk()
            ->assertJsonPath('data.result', 'already_discovered')
            ->assertJsonPath('data.points_awarded', 0);
        $this->assertSame($before, $this->counts());

        $this->makeAnimal($enclosure);
        $this->scan($b)->assertCreated()->assertJsonPath('data.result', 'discovered');
        $after = $this->counts();
        $this->assertSame($before['collections'] + 1, $after['collections']);
        $this->assertGreaterThan($before['points'], $after['points']);
    }

    /** CA-23 enclosure-qr-management */
    public function test_ca23_escaneo_encolado_del_codigo_anterior_responde_inactive_code(): void
    {
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $a = $this->makeQr($enclosure);
        $queuedAt = now()->subHours(2)->toIso8601String();
        $this->regenerate($enclosure);

        $this->scan($a, $queuedAt)->assertUnprocessable()
            ->assertJsonPath('data.code', 'inactive_code')
            ->assertJsonPath('data.message', 'El código no está activo.');
        $this->assertNothingRecorded();
        $this->assertSame('inactive_code', DB::table('visitor_scans')->where('visitor_id', $this->visitor->id)->value('result'));
    }

    /** CA-24 enclosure-qr-management */
    public function test_ca24_eliminar_recinto_conserva_enclosure_count_y_puntos(): void
    {
        $enclosure = $this->makeEnclosure();
        $this->makeAnimal($enclosure);
        $a = $this->makeQr($enclosure);
        $aId = (int) DB::table('enclosure_qr_codes')->where('code', $a)->value('id');
        $this->scan($a)->assertCreated();
        $before = $this->counts();
        $this->assertSame(1, $before['enclosures']);

        app(DeleteEnclosureAction::class)->execute($enclosure);

        $after = $this->counts();
        $this->assertSame($before['enclosures'], $after['enclosures']);
        $this->assertSame($before['points'], $after['points']);
        $this->assertSame($before['collections'], $after['collections']);
        $this->assertSame($before['entries'], $after['entries']);
        $this->assertNotNull(DB::table('enclosure_qr_codes')->where('id', $aId)->value('deleted_at'));
    }

    /** CA-25 enclosure-qr-management */
    public function test_ca25_portal_busqueda_y_mapa_no_cambian_al_regenerar(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $enclosure = $this->makeEnclosure(['name' => 'Recinto '.$tag]);
        $this->makeAnimal($enclosure);
        $this->makeQr($enclosure);
        $snapshot = fn () => [
            $this->getJson('/api/v1/enclosures')->assertOk()->getContent(),
            $this->getJson("/api/v1/enclosures/{$enclosure->id}")->assertOk()->getContent(),
            $this->search($admin, $tag)->assertOk()->getContent(),
        ];
        $before = $snapshot();

        $this->regenerate($enclosure);

        $this->assertSame($before, $snapshot());
    }
}
