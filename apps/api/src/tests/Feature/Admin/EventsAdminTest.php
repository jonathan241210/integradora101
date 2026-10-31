<?php

namespace Tests\Feature\Admin;

use App\Models\Event;
use Illuminate\Support\Facades\DB;

class EventsAdminTest extends AdminFeatureTestCase
{
    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Nuevo evento '.bin2hex(random_bytes(3)),
            'description' => 'Descripción',
            'start_date' => '2099-05-01',
            'end_date' => '2099-05-02',
            'start_time' => '10:00',
            'end_time' => '12:30',
            'location' => 'Plaza central',
        ], $override);
    }

    private function createEvent(array $attributes = []): Event
    {
        return Event::query()->create(array_merge($this->payload(), ['is_active' => true], $attributes));
    }

    /** CA-13 */
    public function test_ca13_administration_management_lists_active_and_inactive_events_by_start_date_desc(): void
    {
        $admin = $this->createAccount('admin');
        $older = $this->createEvent(['start_date' => '2099-01-01', 'end_date' => null]);
        $inactive = $this->createEvent(['start_date' => '2099-02-01', 'end_date' => null, 'is_active' => false]);
        $newest = $this->createEvent(['start_date' => '2099-03-01', 'end_date' => null]);
        $deleted = $this->createEvent(['start_date' => '2099-04-01', 'end_date' => null]);
        $deleted->delete();

        $ids = collect($this->actAs($admin)->getJson('/api/v1/admin/events')->assertOk()->json('data'))->pluck('id');

        $this->assertSame([$newest->id, $inactive->id, $older->id], $ids->take(3)->all());
        $this->assertNotContains($deleted->id, $ids->all());
    }

    /** CA-14 */
    public function test_ca14_administration_management_creates_and_edits_events_and_rejects_invalid_data(): void
    {
        $admin = $this->createAccount('admin');

        $created = $this->actAs($admin)->postJson('/api/v1/admin/events', $this->payload(['image_path' => 'https://evil.test/x.jpg']))
            ->assertCreated()
            ->assertJsonPath('data.author_id', $admin->id)
            ->assertJsonPath('data.start_time', '10:00:00')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.image_path', null);
        $id = $created->json('data.id');

        $this->actAs($admin)->patchJson("/api/v1/admin/events/{$id}", $this->payload(['name' => 'Evento editado', 'location' => 'Otro lugar']))
            ->assertOk()->assertJsonPath('data.name', 'Evento editado')->assertJsonPath('data.location', 'Otro lugar');

        $this->actAs($admin)->postJson('/api/v1/admin/events', $this->payload(['start_date' => '2099-05-10', 'end_date' => '2099-05-01']))
            ->assertUnprocessable()->assertJsonValidationErrors('end_date');
        $this->actAs($admin)->postJson('/api/v1/admin/events', $this->payload(['end_date' => null, 'start_time' => '12:00', 'end_time' => '11:00']))
            ->assertUnprocessable()->assertJsonPath('errors.end_time.0', 'La hora de fin debe ser posterior a la hora de inicio.');
        $this->actAs($admin)->postJson('/api/v1/admin/events', $this->payload(['name' => '']))
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'El campo nombre es obligatorio.');
        $this->actAs($admin)->postJson('/api/v1/admin/events', $this->payload(['start_time' => '25:00']))
            ->assertUnprocessable()->assertJsonValidationErrors('start_time');
        $this->actAs($admin)->patchJson('/api/v1/admin/events/999999999', $this->payload())->assertNotFound()
            ->assertJsonPath('message', 'Evento no encontrado.');

        // Si el evento termina otro día, la hora de fin puede ser menor que la de inicio.
        $this->actAs($admin)->postJson('/api/v1/admin/events', $this->payload(['start_time' => '22:00', 'end_time' => '02:00']))->assertCreated();
    }

    /** CA-15 */
    public function test_ca15_administration_management_toggles_and_soft_deletes_events_and_hides_them_from_the_public_catalog(): void
    {
        $admin = $this->createAccount('admin');
        $event = $this->createEvent(['start_date' => '2099-06-01', 'end_date' => null]);

        $publicIds = fn () => collect($this->getJson('/api/v1/events')->assertOk()->json('data'))->pluck('id')->all();
        $this->assertContains($event->id, $publicIds());

        $this->actAs($admin)->patchJson("/api/v1/admin/events/{$event->id}/status", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertNotContains($event->id, $publicIds());
        $this->actAs($admin)->patchJson("/api/v1/admin/events/{$event->id}/status", ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);
        $this->assertContains($event->id, $publicIds());

        $this->actAs($admin)->deleteJson("/api/v1/admin/events/{$event->id}")->assertNoContent();

        $this->assertNotNull(DB::table('events')->where('id', $event->id)->value('deleted_at'));
        $this->assertNotContains($event->id, $publicIds());
        $this->getJson("/api/v1/events/{$event->id}")->assertNotFound();
        $adminIds = collect($this->actAs($admin)->getJson('/api/v1/admin/events')->json('data'))->pluck('id')->all();
        $this->assertNotContains($event->id, $adminIds);
    }

    /** CA-16 */
    public function test_ca16_administration_management_denies_event_operations_without_permission(): void
    {
        $executive = $this->createAccount('executive');
        $this->actAs($executive);

        foreach ([
            ['getJson', '/api/v1/admin/events'],
            ['postJson', '/api/v1/admin/events'],
            ['patchJson', '/api/v1/admin/events/1'],
            ['patchJson', '/api/v1/admin/events/1/status'],
            ['deleteJson', '/api/v1/admin/events/1'],
        ] as [$method, $uri]) {
            $this->{$method}($uri, [])->assertForbidden()
                ->assertJsonPath('message', 'No tienes permiso para realizar esta acción.');
        }
    }
}
