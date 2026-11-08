<?php

namespace Tests\Feature\Catalog;

use App\Models\Event;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Tests\FeatureTestCase;

class PublicEventsLimitTest extends FeatureTestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** CA-08 public-news-read */
    public function test_ca08_public_events_limit_keeps_default_list_and_limits_when_requested(): void
    {
        Event::query()->update(['is_active' => false]);
        $a = $this->createEvent(['start_date' => '2030-01-01', 'end_date' => null]);
        $b = $this->createEvent(['start_date' => '2030-01-02', 'end_date' => null]);
        $c = $this->createEvent(['start_date' => '2030-01-03', 'end_date' => null]);

        $full = $this->getJson('/api/v1/events')->assertOk()->assertJsonCount(3, 'data')->assertJsonMissingPath('meta');
        $this->assertSame([$a->id, $b->id, $c->id], array_column($full->json('data'), 'id'));

        $limited = $this->getJson('/api/v1/events?limit=2')->assertOk()->assertJsonCount(2, 'data')->assertJsonMissingPath('meta');
        $this->assertSame([$a->id, $b->id], array_column($limited->json('data'), 'id'));

        $this->getJson('/api/v1/events?limit=0')->assertStatus(422)->assertJsonValidationErrors('limit');
        $this->getJson('/api/v1/events?limit=51')->assertStatus(422)->assertJsonPath('errors.limit.0', 'El límite debe ser un número entero entre 1 y 50.');
    }

    /** CA-12 public-news-read */
    public function test_ca12_public_visibility_uses_mexico_city_date_for_events(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-07 05:30:00', 'UTC'));
        Event::query()->update(['is_active' => false]);
        $endsToday = $this->createEvent(['start_date' => '2026-11-01', 'end_date' => '2026-11-06']);
        $expired = $this->createEvent(['start_date' => '2026-11-01', 'end_date' => '2026-11-05']);

        $ids = array_column($this->getJson('/api/v1/events')->assertOk()->json('data'), 'id');
        $this->assertSame([$endsToday->id], $ids);
        $this->getJson('/api/v1/events/'.$endsToday->id)->assertOk();
        $this->getJson('/api/v1/events/'.$expired->id)->assertNotFound();
        $this->assertSame('UTC', config('app.timezone'));
    }

    private function createEvent(array $attributes = []): Event
    {
        return Model::unguarded(fn () => Event::query()->create(array_merge([
            'name' => 'Evento '.Str::random(8),
            'description' => 'Descripción de prueba',
            'image_path' => null,
            'start_date' => '2030-01-01',
            'end_date' => null,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'location' => 'Ubicación de prueba',
            'is_active' => true,
        ], $attributes)));
    }
}
