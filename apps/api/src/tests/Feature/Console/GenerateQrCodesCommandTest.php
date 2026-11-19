<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\FeatureTestCase;

class GenerateQrCodesCommandTest extends FeatureTestCase
{
    use BuildsEnclosureFixtures;

    /** CA-18 enclosure-qr-management */
    public function test_ca18_comando_reutiliza_activo_y_regenerate_crea_nuevo(): void
    {
        $enclosure = $this->makeEnclosure();
        $existing = $this->makeQr($enclosure);

        $this->artisan('arca:generate-qr-codes', ['enclosure' => $enclosure->id])
            ->expectsOutput($existing)->assertSuccessful();
        $this->assertSame(1, DB::table('enclosure_qr_codes')->where('enclosure_id', $enclosure->id)->count());

        $this->artisan('arca:generate-qr-codes', ['enclosure' => $enclosure->id, '--regenerate' => true])
            ->assertSuccessful();
        $rows = DB::table('enclosure_qr_codes')->where('enclosure_id', $enclosure->id)->orderBy('id')->get();
        $this->assertCount(2, $rows);
        $this->assertSame([0, 1], $rows->pluck('is_active')->map(fn ($v) => (int) $v)->all());
        $this->assertNotSame($existing, $rows[1]->code);

        $empty = $this->makeEnclosure();
        $this->artisan('arca:generate-qr-codes', ['enclosure' => $empty->id])->assertSuccessful();
        $created = DB::table('enclosure_qr_codes')->where('enclosure_id', $empty->id)->get();
        $this->assertCount(1, $created);
        $this->assertMatchesRegularExpression('/^ARCA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/', $created[0]->code);

        $deleted = $this->makeEnclosure();
        $deleted->delete();
        foreach ([$deleted->id, 999999999] as $id) {
            $this->artisan('arca:generate-qr-codes', ['enclosure' => $id])
                ->expectsOutput('El recinto no existe.')->assertFailed();
        }
    }
}
