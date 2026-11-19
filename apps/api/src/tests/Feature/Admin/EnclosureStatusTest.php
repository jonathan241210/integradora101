<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureStatusTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;

    private function url(int|string $id): string
    {
        return "/api/v1/admin/enclosures/{$id}/status";
    }

    /** CA-01 enclosure-status-and-global-search */
    public function test_ca01_deactivates_active_enclosure_without_deleting(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $this->actAs($admin)->patchJson($this->url($enclosure->id), ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.id', $enclosure->id);

        $row = DB::table('enclosures')->where('id', $enclosure->id)->first();
        $this->assertSame(0, (int) $row->is_active);
        $this->assertNull($row->deleted_at);
    }

    /** CA-02 enclosure-status-and-global-search */
    public function test_ca02_activates_inactive_enclosure(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure(['is_active' => 0]);

        $this->actAs($admin)->patchJson($this->url($enclosure->id), ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertSame(1, (int) DB::table('enclosures')->where('id', $enclosure->id)->value('is_active'));

        $ids = collect($this->getJson('/api/v1/enclosures')->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($enclosure->id));
    }

    /** CA-03 enclosure-status-and-global-search */
    public function test_ca03_same_state_is_noop_without_log(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $before = $this->activityCount($enclosure);

        $this->actAs($admin)->patchJson($this->url($enclosure->id), ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);

        $this->assertSame($before, $this->activityCount($enclosure));
        $this->assertSame(1, (int) DB::table('enclosures')->where('id', $enclosure->id)->value('is_active'));
    }

    /** CA-04 enclosure-status-and-global-search */
    public function test_ca04_rejects_non_boolean_is_active(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        foreach ([['is_active' => '1'], ['is_active' => '0'], ['is_active' => 'sí'], ['is_active' => 1], []] as $body) {
            $this->actAs($admin)->patchJson($this->url($enclosure->id), $body)
                ->assertUnprocessable()->assertJsonValidationErrors('is_active')
                ->assertJsonPath('errors.is_active.0', 'El estado del recinto debe ser verdadero o falso.');
        }

        $this->assertSame(1, (int) DB::table('enclosures')->where('id', $enclosure->id)->value('is_active'));
    }

    /** CA-07 enclosure-status-and-global-search */
    public function test_ca07_unknown_or_deleted_returns_404_on_status(): void
    {
        $admin = $this->createAccount('admin');
        $deleted = $this->makeEnclosure();
        $deleted->delete();

        $this->actAs($admin)->patchJson($this->url(999999999), ['is_active' => false])
            ->assertNotFound()->assertExactJson(['message' => 'Recinto no encontrado.']);
        $this->actAs($admin)->patchJson($this->url($deleted->id), ['is_active' => false])
            ->assertNotFound()->assertExactJson(['message' => 'Recinto no encontrado.']);
        $this->assertSame(1, (int) DB::table('enclosures')->where('id', $deleted->id)->value('is_active'));
    }

    /** CA-08 enclosure-status-and-global-search */
    public function test_ca08_logs_status_change_only(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $this->actAs($admin)->patchJson($this->url($enclosure->id), ['is_active' => false])->assertOk();
        $this->actAs($admin)->patchJson($this->url($enclosure->id), ['is_active' => true])->assertOk();
        $this->actAs($admin)->patchJson($this->url($enclosure->id), ['is_active' => 'x'])->assertUnprocessable();

        $logs = DB::table('activity_log')->where('subject_type', $enclosure::class)->where('subject_id', $enclosure->id)
            ->orderBy('id')->get();
        $this->assertSame(['Recinto desactivado', 'Recinto activado'], $logs->pluck('description')->all());
        $this->assertSame($admin->id, (int) $logs->first()->causer_id);
        $this->assertStringNotContainsString('password', (string) $logs->first()->properties);
    }
}
