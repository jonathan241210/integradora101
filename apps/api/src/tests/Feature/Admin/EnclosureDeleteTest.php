<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureDeleteTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;

    /** CA-05 enclosure-status-and-global-search */
    public function test_ca05_soft_deletes_active_or_inactive_enclosure(): void
    {
        $admin = $this->createAccount('admin');

        foreach ([1, 0] as $active) {
            $enclosure = $this->makeEnclosure(['is_active' => $active]);

            $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")
                ->assertOk()->assertExactJson(['message' => 'Recinto eliminado.']);

            $this->assertNotNull(DB::table('enclosures')->where('id', $enclosure->id)->value('deleted_at'));
            $ids = collect($this->actAs($admin)->getJson('/api/v1/admin/enclosures')->json('data'))->pluck('id');
            $this->assertFalse($ids->contains($enclosure->id));
            $publicIds = collect($this->getJson('/api/v1/enclosures')->json('data'))->pluck('id');
            $this->assertFalse($publicIds->contains($enclosure->id));
        }
    }

    /** CA-06 enclosure-status-and-global-search */
    public function test_ca06_keeps_animals_enclosure_id(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $animals = [$this->makeAnimal($enclosure), $this->makeAnimal($enclosure), $this->makeAnimal($enclosure)];

        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")->assertOk();

        $rows = DB::table('animals')->whereIn('id', $animals)->get();
        $this->assertCount(3, $rows);
        $this->assertSame([$enclosure->id], $rows->pluck('enclosure_id')->unique()->map(fn ($v) => (int) $v)->all());
        $this->assertNull($rows->first()->deleted_at);
    }

    /** CA-07 enclosure-status-and-global-search */
    public function test_ca07_unknown_or_deleted_returns_404_on_delete(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")->assertOk();

        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")
            ->assertNotFound()->assertExactJson(['message' => 'Recinto no encontrado.']);
        $this->actAs($admin)->deleteJson('/api/v1/admin/enclosures/999999999')
            ->assertNotFound()->assertExactJson(['message' => 'Recinto no encontrado.']);
    }

    /** CA-08 enclosure-status-and-global-search */
    public function test_ca08_logs_delete_and_rejected_attempt_logs_nothing(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")->assertOk();
        $this->assertSame(1, $this->activityCount($enclosure));
        $log = DB::table('activity_log')->where('subject_type', $enclosure::class)->where('subject_id', $enclosure->id)->first();
        $this->assertSame('Recinto eliminado', $log->description);
        $this->assertSame($admin->id, (int) $log->causer_id);

        $total = DB::table('activity_log')->count();
        $this->actAs($admin)->deleteJson("/api/v1/admin/enclosures/{$enclosure->id}")->assertNotFound();
        $this->assertSame($total, DB::table('activity_log')->count());
    }
}
