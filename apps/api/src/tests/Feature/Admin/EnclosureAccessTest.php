<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureAccessTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;

    /** CA-09 enclosure-status-and-global-search */
    public function test_ca09_requires_session_and_enclosures_manage(): void
    {
        $enclosure = $this->makeEnclosure();
        $base = '/api/v1/admin/enclosures';
        $calls = fn () => [
            ['getJson', $base, []],
            ['patchJson', "{$base}/{$enclosure->id}/status", ['is_active' => false]],
            ['deleteJson', "{$base}/{$enclosure->id}", []],
        ];

        foreach ($calls() as [$method, $url, $body]) {
            $this->{$method}($url, $body)->assertUnauthorized();
        }

        $cashier = $this->createAccount('cashier');
        foreach ($calls() as [$method, $url, $body]) {
            $this->actAs($cashier)->{$method}($url, $body)->assertForbidden();
        }

        $row = DB::table('enclosures')->where('id', $enclosure->id)->first();
        $this->assertSame(1, (int) $row->is_active);
        $this->assertNull($row->deleted_at);
    }
}
