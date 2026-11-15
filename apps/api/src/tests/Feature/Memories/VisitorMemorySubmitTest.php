<?php

namespace Tests\Feature\Memories;

use App\Models\Visitor;
use App\Models\VisitorMemory;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemorySubmitTest extends VisitorFeatureTestCase
{
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    /** CA-01 */
    public function test_ca01_visitor_submits_memory_and_gets_201_without_url(): void
    {
        config(['memories.terms_version' => 'v7']);
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        $response = $this->submitMemory($token, ['opinion' => '  Mi primer jaguar  '])
            ->assertCreated()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.opinion', 'Mi primer jaguar')
            ->assertJsonPath('data.resubmitted_count', 0);

        $this->assertNotNull($response->json('data.id'));
        $this->assertNotNull($response->json('data.created_at'));

        $keys = array_keys($response->json('data'));
        foreach (['image_path', 'image_url', 'url', 'image_sha256', 'visitor_id', 'published_image_path'] as $forbidden) {
            $this->assertNotContains($forbidden, $keys);
        }
        $this->assertStringNotContainsString('memories/', $response->getContent());
        $this->assertStringNotContainsString('http', $response->getContent());

        $memory = VisitorMemory::query()->findOrFail($response->json('data.id'));
        $this->assertSame($visitor->id, (int) $memory->visitor_id);
        $this->assertSame('submitted', $memory->status);
        $this->assertSame(0, (int) $memory->resubmitted_count);
        $this->assertSame('v7', $memory->terms_version);
        $this->assertNotNull($memory->consent_at);
        $this->assertTrue($disk->exists($memory->image_path));
    }

    /** CA-01 */
    public function test_ca01_opinion_is_optional_and_stored_as_null(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();

        $this->submitMemory($token, ['opinion' => '   '])
            ->assertCreated()
            ->assertJsonPath('data.opinion', null);

        $this->assertNull(VisitorMemory::query()->where('visitor_id', $visitor->id)->value('opinion'));
    }

    /** CA-05 */
    public function test_ca05_no_session_401_and_unverified_email_403_write_nothing(): void
    {
        $disk = $this->fakeMemoryDisk();

        $this->withHeader('Accept', 'application/json')
            ->post('/api/v1/visitor/memories', ['image' => $this->memoryImage(), 'consent' => '1'])
            ->assertStatus(401);

        // Un token de visitante con el correo sin verificar (no lo emite la API, pero la ruta lo comprueba).
        $email = $this->registerVisitor();
        $visitor = Visitor::query()->where('email', $email)->firstOrFail();
        $this->assertNull($visitor->email_verified_at);
        $token = $visitor->createToken('prueba', ['visitor'], now()->addMinutes(15))->plainTextToken;

        $this->submitMemory($token)
            ->assertStatus(403)
            ->assertJsonPath('code', 'email_not_verified');

        $this->withVisitorToken($token)->getJson('/api/v1/visitor/memories')
            ->assertStatus(403)->assertJsonPath('code', 'email_not_verified');
        $this->resubmitMemory($token, 1)->assertStatus(403)->assertJsonPath('code', 'email_not_verified');

        $this->assertNothingStored($disk, $visitor->id);
    }

    /** CA-05 */
    public function test_ca05_staff_or_foreign_tokens_cannot_reach_visitor_memory_routes(): void
    {
        $this->fakeMemoryDisk();
        $this->withHeader('Accept', 'application/json')->withToken('token-inexistente')
            ->post('/api/v1/visitor/memories', ['image' => $this->memoryImage(), 'consent' => '1'])
            ->assertStatus(401);
    }
}
