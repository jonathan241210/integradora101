<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemoryReview;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\FeatureTestCase;

class MemoriesRejectTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;

    /** CA-12 */
    public function test_ca12_reject_with_reason_and_fields_creates_history_and_no_publication(): void
    {
        $user = $this->createMemoryStaff();
        $memory = $this->createMemory(['image_path' => 'memories/'.fake()->uuid().'.jpg']);
        $sha = $memory->image_sha256;

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'La foto es borrosa.',
            'rejected_fields' => ['image', 'content'],
        ])->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'La foto es borrosa.')
            ->assertJsonPath('data.rejected_fields', ['image', 'content'])
            ->assertJsonPath('data.is_published', false);

        $fresh = $memory->fresh();
        $this->assertSame('rejected', $fresh->status);
        $this->assertSame($user->id, $fresh->reviewed_by);
        $this->assertNotNull($fresh->reviewed_at);
        $this->assertTrue($fresh->rejected_image);
        $this->assertTrue($fresh->rejected_content);
        $this->assertNull($fresh->published_at);
        $this->assertNull($fresh->published_until);
        $this->assertNull($fresh->published_image_path);
        // Con `image` marcado: image_path en NULL y hash conservado (CA-29; el borrado del archivo es de T-14).
        $this->assertNull($fresh->image_path);
        $this->assertSame($sha, $fresh->image_sha256);

        $review = VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->sole();
        $this->assertSame('rejected', $review->decision);
        $this->assertSame('La foto es borrosa.', $review->rejection_reason);
        $this->assertTrue($review->rejected_image);
        $this->assertTrue($review->rejected_content);
        $this->assertSame($user->id, $review->reviewed_by);
    }

    /** CA-12 */
    public function test_ca12_reject_from_in_review_with_content_only_keeps_image_path(): void
    {
        $user = $this->createMemoryStaff();
        $memory = $this->createMemory([], 'in_review');
        $path = $memory->image_path;

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", [
            'rejection_reason' => 'La opinión no es apropiada.',
            'rejected_fields' => ['content'],
        ])->assertOk()->assertJsonPath('data.rejected_fields', ['content']);

        $this->assertSame($path, $memory->fresh()->image_path);
        $this->assertFalse($memory->fresh()->rejected_image);
    }

    /** CA-28 */
    public function test_ca28_reject_validates_reason_and_fields_in_spanish(): void
    {
        $user = $this->createMemoryStaff();
        $memory = $this->createMemory();
        $url = "/api/v1/admin/memories/{$memory->id}/reject";
        $this->actingAs($user, 'web');

        $cases = [
            'sin motivo' => [['rejected_fields' => ['image']], 'rejection_reason'],
            'motivo largo' => [['rejection_reason' => str_repeat('a', 501), 'rejected_fields' => ['image']], 'rejection_reason'],
            'sin campos' => [['rejection_reason' => 'x'], 'rejected_fields'],
            'lista vacía' => [['rejection_reason' => 'x', 'rejected_fields' => []], 'rejected_fields'],
            'valor inválido' => [['rejection_reason' => 'x', 'rejected_fields' => ['photo']], 'rejected_fields'],
            'repetidos' => [['rejection_reason' => 'x', 'rejected_fields' => ['image', 'image']], 'rejected_fields'],
            'tres valores' => [['rejection_reason' => 'x', 'rejected_fields' => ['image', 'content', 'content']], 'rejected_fields'],
        ];

        foreach ($cases as $label => [$payload, $key]) {
            $response = $this->postJson($url, $payload)->assertStatus(422);
            $this->assertNotEmpty($response->json("errors.{$key}"), $label);
        }

        $this->postJson($url, ['rejected_fields' => ['image']])
            ->assertJsonPath('errors.rejection_reason.0', 'Motivo requerido (1-500 caracteres).');
        $this->postJson($url, ['rejection_reason' => 'x'])
            ->assertJsonPath('errors.rejected_fields.0', 'Indica qué falló: la foto, la opinión o ambas.');

        $this->postJson($url, ['rejection_reason' => str_repeat('a', 500), 'rejected_fields' => ['content']])->assertOk();

        $this->assertSame(1, VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->count());
    }

    /** CA-28 */
    public function test_ca28_invalid_payload_changes_nothing(): void
    {
        $user = $this->createMemoryStaff();
        $memory = $this->createMemory();

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$memory->id}/reject", ['rejection_reason' => ''])->assertStatus(422);

        $this->assertSame('submitted', $memory->fresh()->status);
        $this->assertSame(0, VisitorMemoryReview::query()->where('visitor_memory_id', $memory->id)->count());
    }

    /** CA-13 */
    public function test_ca13_rejected_waits_for_visitor_correction(): void
    {
        $user = $this->createMemoryStaff();
        $this->actingAs($user, 'web');
        $payload = ['rejection_reason' => 'Otra vez.', 'rejected_fields' => ['content']];

        $rejected = $this->createMemory(['rejection_reason' => 'Original', 'rejected_content' => true], 'rejected');
        $this->postJson("/api/v1/admin/memories/{$rejected->id}/reject", $payload)->assertStatus(422)
            ->assertJsonPath('message', 'Esta petición está rechazada y espera la corrección del visitante.')
            ->assertJsonPath('errors.status.0', 'Esta petición está rechazada y espera la corrección del visitante.');
        $this->assertSame('Original', $rejected->fresh()->rejection_reason);
        $this->assertSame(0, VisitorMemoryReview::query()->where('visitor_memory_id', $rejected->id)->count());
    }

    /** CA-13 */
    public function test_ca13_accepted_cannot_be_rejected_again(): void
    {
        $user = $this->createMemoryStaff();
        $accepted = $this->createMemory(['published_until' => now()->addDay()], 'accepted');

        $this->actingAs($user, 'web')->postJson("/api/v1/admin/memories/{$accepted->id}/reject", ['rejection_reason' => 'x', 'rejected_fields' => ['image']])
            ->assertStatus(422)->assertJsonPath('message', 'Esta petición ya fue revisada.');

        $this->assertSame('accepted', $accepted->fresh()->status);
        $this->assertNotNull($accepted->fresh()->image_path);
    }

    /** CA-12 */
    public function test_ca12_unknown_memory_returns_404(): void
    {
        $user = $this->createMemoryStaff();

        $this->actingAs($user, 'web')->postJson('/api/v1/admin/memories/999999999/reject', ['rejection_reason' => 'x', 'rejected_fields' => ['image']])
            ->assertNotFound()->assertJsonPath('message', 'Petición no encontrada.');
    }
}
