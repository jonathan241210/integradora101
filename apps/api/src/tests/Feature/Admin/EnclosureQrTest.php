<?php

namespace Tests\Feature\Admin;

use App\Actions\Admin\Enclosures\Qr\QrCodeValueGenerator;
use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class EnclosureQrTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    private const NOT_FOUND = 'Recinto no encontrado.';

    private function url(int|string $id, string $suffix = ''): string
    {
        return "/api/v1/admin/enclosures/{$id}/qr{$suffix}";
    }

    private function addQr(Enclosure $enclosure, string $code, bool $active = true): int
    {
        return (int) DB::table('enclosure_qr_codes')->insertGetId([
            'enclosure_id' => $enclosure->id,
            'code' => $code,
            'is_active' => $active ? 1 : 0,
        ]);
    }

    private function newCode(): string
    {
        return 'ARCA-'.strtoupper(substr(bin2hex(random_bytes(5)), 0, 8));
    }

    private function qrRows(Enclosure $enclosure)
    {
        return DB::table('enclosure_qr_codes')->where('enclosure_id', $enclosure->id)->orderBy('id')->get();
    }

    private function totalActivity(): int
    {
        return DB::table('activity_log')->count();
    }

    /** CA-01 enclosure-qr-management */
    public function test_ca01_consultar_codigo_activo_sin_efectos(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $code = $this->newCode();
        $this->addQr($enclosure, $code);
        $rows = $this->qrRows($enclosure)->count();
        $activity = $this->totalActivity();

        $response = $this->actAs($admin)->getJson($this->url($enclosure->id))->assertOk();

        $response->assertJsonPath('enclosure', ['id' => $enclosure->id, 'name' => $enclosure->name, 'is_active' => true]);
        $response->assertJsonPath('qr.code', $code);
        $svg = $response->json('qr.svg');
        $this->assertStringContainsString('<svg', $svg);
        $this->assertNotFalse(simplexml_load_string($svg));
        $this->assertSame($rows, $this->qrRows($enclosure)->count());
        $this->assertSame($activity, $this->totalActivity());
    }

    /** CA-02 enclosure-qr-management */
    public function test_ca02_consulta_sin_codigo_devuelve_null(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->addQr($enclosure, $this->newCode(), false);

        $this->actAs($admin)->getJson($this->url($enclosure->id))
            ->assertOk()->assertJsonPath('qr', null);
        $this->assertCount(1, $this->qrRows($enclosure));
    }

    /** CA-03 enclosure-qr-management */
    public function test_ca03_generar_crea_una_fila_y_registra_actividad(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $response = $this->actAs($admin)->postJson($this->url($enclosure->id))->assertCreated();

        $rows = $this->qrRows($enclosure);
        $this->assertCount(1, $rows);
        $this->assertSame(1, (int) $rows[0]->is_active);
        $response->assertJsonPath('qr.code', $rows[0]->code);
        $this->assertStringContainsString('<svg', $response->json('qr.svg'));
        $this->assertArrayNotHasKey('deactivated', $response->json());
        $this->assertSame(1, DB::table('activity_log')->where('subject_id', $enclosure->id)
            ->where('subject_type', Enclosure::class)->where('description', 'Código QR generado')->count());
    }

    /** CA-04 enclosure-qr-management */
    public function test_ca04_generar_con_activo_no_duplica(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $code = $this->newCode();
        $this->addQr($enclosure, $code);
        $activity = $this->totalActivity();

        $this->actAs($admin)->postJson($this->url($enclosure->id))
            ->assertOk()->assertJsonPath('qr.code', $code);

        $this->assertCount(1, $this->qrRows($enclosure));
        $this->assertSame($activity, $this->totalActivity());
    }

    /** CA-05 enclosure-qr-management */
    public function test_ca05_regenerar_desactiva_y_no_elimina(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $old = $this->newCode();
        $oldId = $this->addQr($enclosure, $old);

        $response = $this->actAs($admin)->postJson($this->url($enclosure->id, '/regenerate'))
            ->assertOk()->assertJsonPath('deactivated', 1);

        $new = $response->json('qr.code');
        $this->assertNotSame($old, $new);
        $rows = $this->qrRows($enclosure);
        $this->assertCount(2, $rows);
        $active = $rows->where('is_active', 1);
        $this->assertCount(1, $active);
        $this->assertSame($new, $active->first()->code);
        $previous = $rows->firstWhere('id', $oldId);
        $this->assertSame(0, (int) $previous->is_active);
        $this->assertNull($previous->deleted_at);
        $this->assertSame(1, DB::table('activity_log')->where('subject_id', $enclosure->id)
            ->where('description', 'Código QR regenerado')->count());
    }

    /** CA-06 enclosure-qr-management */
    public function test_ca06_regenerar_sin_codigo_previo(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $this->actAs($admin)->postJson($this->url($enclosure->id, '/regenerate'))
            ->assertOk()->assertJsonPath('deactivated', 0);

        $this->assertCount(1, $this->qrRows($enclosure)->where('is_active', 1));
        $this->assertCount(1, $this->qrRows($enclosure));
    }

    /** CA-07 enclosure-qr-management */
    public function test_ca07_varios_activos_muestra_el_mayor_y_regenerar_desactiva_todos(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->addQr($enclosure, $this->newCode());
        $higher = $this->newCode();
        $this->addQr($enclosure, $higher);

        $this->actAs($admin)->getJson($this->url($enclosure->id))->assertJsonPath('qr.code', $higher);
        $this->actAs($admin)->postJson($this->url($enclosure->id))->assertOk()->assertJsonPath('qr.code', $higher);
        $this->assertCount(2, $this->qrRows($enclosure)->where('is_active', 1));

        $response = $this->actAs($admin)->postJson($this->url($enclosure->id, '/regenerate'))
            ->assertOk()->assertJsonPath('deactivated', 2);

        $active = $this->qrRows($enclosure)->where('is_active', 1);
        $this->assertCount(1, $active);
        $this->assertSame($response->json('qr.code'), $active->first()->code);
        $this->assertCount(3, $this->qrRows($enclosure));
    }

    /** CA-09 enclosure-qr-management */
    public function test_ca09_colision_reintenta_y_luego_responde_500(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $taken = $this->newCode();
        $this->addQr($this->makeEnclosure(), $taken);
        $free = $this->newCode();

        $this->app->instance(QrCodeValueGenerator::class, new class([$taken, $free]) implements QrCodeValueGenerator
        {
            public function __construct(private array $values) {}

            public function generate(): string
            {
                return array_shift($this->values);
            }
        });
        $this->actAs($admin)->postJson($this->url($enclosure->id))->assertCreated()->assertJsonPath('qr.code', $free);

        $other = $this->makeEnclosure();
        $calls = 0;
        $this->app->instance(QrCodeValueGenerator::class, new class($taken, $calls) implements QrCodeValueGenerator
        {
            public function __construct(private string $value, public int &$calls) {}

            public function generate(): string
            {
                $this->calls++;

                return $this->value;
            }
        });
        $response = $this->actAs($admin)->postJson($this->url($other->id))->assertStatus(500);

        $this->assertSame('No pudimos generar el código QR. Inténtalo de nuevo.', $response->json('message'));
        $this->assertSame(5, $calls);
        $this->assertCount(0, $this->qrRows($other));
        $this->assertStringNotContainsString($taken, $response->getContent());
    }

    /** CA-10 enclosure-qr-management */
    public function test_ca10_activitylog_sin_valor_del_codigo(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $oldId = $this->addQr($enclosure, $old = $this->newCode());

        $generated = $this->actAs($admin)->postJson($this->url($this->makeEnclosure()->id))->assertCreated();
        $regenerated = $this->actAs($admin)->postJson($this->url($enclosure->id, '/regenerate'))->assertOk();

        $logs = DB::table('activity_log')->where('description', 'like', 'Código QR%')->get();
        $this->assertCount(2, $logs);
        $dump = json_encode($logs);
        foreach ([$old, $generated->json('qr.code'), $regenerated->json('qr.code')] as $code) {
            $this->assertStringNotContainsString($code, $dump);
        }
        $log = $logs->firstWhere('description', 'Código QR regenerado');
        $this->assertSame($admin->id, (int) $log->causer_id);
        $this->assertSame($enclosure->id, (int) $log->subject_id);
        $properties = json_decode($log->properties, true);
        $this->assertSame([$oldId], $properties['deactivated_ids']);
        $this->assertArrayHasKey('qr_code_id', $properties);
    }

    /** CA-11 enclosure-qr-management */
    public function test_ca11_recinto_inactivo_responde_igual_con_is_active_false(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure(['is_active' => 0]);

        $this->actAs($admin)->getJson($this->url($enclosure->id))
            ->assertOk()->assertJsonPath('enclosure.is_active', false)->assertJsonPath('qr', null);
        $this->actAs($admin)->postJson($this->url($enclosure->id))
            ->assertCreated()->assertJsonPath('enclosure.is_active', false);
        $this->actAs($admin)->postJson($this->url($enclosure->id, '/regenerate'))
            ->assertOk()->assertJsonPath('enclosure.is_active', false)->assertJsonPath('deactivated', 1);
    }

    /** CA-12 enclosure-qr-management */
    public function test_ca12_recinto_eliminado_o_inexistente_responde_404(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->addQr($enclosure, $this->newCode());
        $enclosure->delete();
        $activity = $this->totalActivity();

        foreach ([$enclosure->id, 999999999] as $id) {
            $this->actAs($admin)->getJson($this->url($id))->assertNotFound()->assertExactJson(['message' => self::NOT_FOUND]);
            $this->actAs($admin)->postJson($this->url($id))->assertNotFound()->assertExactJson(['message' => self::NOT_FOUND]);
            $this->actAs($admin)->postJson($this->url($id, '/regenerate'))->assertNotFound()->assertExactJson(['message' => self::NOT_FOUND]);
        }

        $this->assertCount(1, $this->qrRows($enclosure));
        $this->assertSame($activity, $this->totalActivity());
    }

    /** CA-13 enclosure-qr-management */
    public function test_ca13_sin_sesion_401_y_sin_permiso_403(): void
    {
        $enclosure = $this->makeEnclosure();
        $calls = [['getJson', $this->url($enclosure->id)], ['postJson', $this->url($enclosure->id)], ['postJson', $this->url($enclosure->id, '/regenerate')]];

        foreach ($calls as [$method, $url]) {
            $this->{$method}($url)->assertUnauthorized();
        }

        $cashier = $this->createAccount('cashier');
        foreach ($calls as [$method, $url]) {
            $this->actAs($cashier)->{$method}($url)->assertForbidden();
        }

        $this->assertCount(0, $this->qrRows($enclosure));
    }

    /** CA-14 enclosure-qr-management */
    public function test_ca14_listado_admin_incluye_has_active_qr_sin_codigo(): void
    {
        $admin = $this->createAccount('admin');
        $with = $this->makeEnclosure();
        $code = $this->newCode();
        $this->addQr($with, $code);
        $inactive = $this->makeEnclosure();
        $this->addQr($inactive, $this->newCode(), false);
        $deletedCode = $this->makeEnclosure();
        $deletedId = $this->addQr($deletedCode, $this->newCode());
        EnclosureQrCode::query()->whereKey($deletedId)->delete();
        $none = $this->makeEnclosure();

        $response = $this->actAs($admin)->getJson('/api/v1/admin/enclosures')->assertOk();
        $rows = collect($response->json('data'))->keyBy('id');

        $this->assertTrue($rows[$with->id]['has_active_qr']);
        $this->assertFalse($rows[$inactive->id]['has_active_qr']);
        $this->assertFalse($rows[$deletedCode->id]['has_active_qr']);
        $this->assertFalse($rows[$none->id]['has_active_qr']);
        $this->assertStringNotContainsString($code, $response->getContent());
        $this->assertArrayNotHasKey('svg', $rows[$with->id]);
        $this->assertArrayNotHasKey('code', $rows[$with->id]);
    }

    /** CA-15 enclosure-qr-management */
    public function test_ca15_rutas_publicas_no_exponen_codigo(): void
    {
        $enclosure = $this->makeEnclosure();
        $code = $this->newCode();
        $this->addQr($enclosure, $code);

        foreach (['/api/v1/enclosures', "/api/v1/enclosures/{$enclosure->id}"] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();
            $this->assertStringNotContainsString($code, $body);
            foreach (['"code"', '"svg"', '"qr"', 'has_active_qr'] as $needle) {
                $this->assertStringNotContainsString($needle, $body);
            }
        }
    }

    /** CA-16 enclosure-qr-management */
    public function test_ca16_busqueda_global_no_encuentra_por_codigo(): void
    {
        $admin = $this->searchAdmin();
        $enclosure = $this->makeEnclosure();
        $code = $this->newCode();
        $this->addQr($enclosure, $code);

        $response = $this->search($admin, $code)->assertOk();

        foreach ($response->json('groups') as $group) {
            $this->assertNotContains($enclosure->id, $group['section'] === 'enclosures' ? array_column($group['items'], 'id') : []);
        }
        $this->assertStringNotContainsString($code, json_encode(array_map(fn ($g) => $g['items'], $response->json('groups'))));
    }

    /** CA-19 enclosure-qr-management */
    public function test_ca19_eliminar_recinto_marca_deleted_at_en_sus_codigos(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $other = $this->makeEnclosure();
        $this->addQr($enclosure, $this->newCode());
        $this->addQr($enclosure, $this->newCode(), false);
        $otherId = $this->addQr($other, $this->newCode());

        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")->assertOk();

        $rows = $this->qrRows($enclosure);
        $this->assertCount(2, $rows);
        $this->assertNotNull($rows[0]->deleted_at);
        $this->assertNotNull($rows[1]->deleted_at);
        $this->assertSame([1, 0], $rows->pluck('is_active')->map(fn ($v) => (int) $v)->all());
        $this->assertNull(DB::table('enclosure_qr_codes')->where('id', $otherId)->value('deleted_at'));
    }

    /** RN-05 enclosure-qr-management */
    public function test_rn05_generar_regenerar_y_eliminar_bloquean_el_recinto(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        foreach ([['postJson', $this->url($enclosure->id)], ['postJson', $this->url($enclosure->id, '/regenerate')], ['deleteJson', "/api/v1/admin/enclosures/{$enclosure->id}"]] as [$method, $url]) {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->actAs($admin)->{$method}($url)->assertSuccessful();
            $locked = collect(DB::getQueryLog())->contains(fn ($q) => str_contains($q['query'], 'from `enclosures`') && str_contains($q['query'], 'for update'));
            DB::disableQueryLog();
            $this->assertTrue($locked, $url);
        }
    }
}
