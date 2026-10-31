<?php

namespace Tests\Feature\Admin;

use App\Models\News;
use Illuminate\Support\Facades\DB;

class NewsAdminTest extends AdminFeatureTestCase
{
    private function payload(array $override = []): array
    {
        return array_merge([
            'title' => 'Nueva noticia '.bin2hex(random_bytes(3)),
            'description' => 'Resumen',
            'content' => 'Contenido completo de la noticia.',
            'category' => 'Institucional',
            'published_date' => '2026-10-30',
            'start_date' => '2026-10-30',
            'end_date' => '2026-11-30',
        ], $override);
    }

    private function createNews(array $attributes = []): News
    {
        return News::query()->create(array_merge($this->payload(), ['is_active' => true], $attributes));
    }

    /** CA-13 */
    public function test_ca13_administration_management_lists_active_and_inactive_news_by_publication_date_desc(): void
    {
        $admin = $this->createAccount('admin');
        $older = $this->createNews(['published_date' => '2099-01-01']);
        $inactive = $this->createNews(['published_date' => '2099-02-01', 'is_active' => false]);
        $newest = $this->createNews(['published_date' => '2099-03-01']);
        $deleted = $this->createNews(['published_date' => '2099-04-01']);
        $deleted->delete();

        $ids = collect($this->actAs($admin)->getJson('/api/v1/admin/news')->assertOk()->json('data'))->pluck('id');

        $this->assertSame([$newest->id, $inactive->id, $older->id], $ids->take(3)->all());
        $this->assertNotContains($deleted->id, $ids->all());
    }

    /** CA-14 */
    public function test_ca14_administration_management_creates_and_edits_news_and_rejects_invalid_data(): void
    {
        $admin = $this->createAccount('admin');
        $other = $this->createAccount('zoo-admin');

        $created = $this->actAs($admin)->postJson('/api/v1/admin/news', $this->payload(['image_path' => 'https://evil.test/x.jpg']))
            ->assertCreated()
            ->assertJsonPath('data.author_id', $admin->id)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.image_path', null);
        $id = $created->json('data.id');

        $this->actAs($other)->patchJson("/api/v1/admin/news/{$id}", $this->payload(['title' => 'Título editado', 'is_active' => false]))
            ->assertOk()->assertJsonPath('data.title', 'Título editado')
            ->assertJsonPath('data.author_id', $admin->id)
            ->assertJsonPath('data.is_active', true);

        $this->actAs($admin)->postJson('/api/v1/admin/news', $this->payload(['start_date' => '2026-11-10', 'end_date' => '2026-11-01']))
            ->assertUnprocessable()->assertJsonValidationErrors('end_date');
        $this->actAs($admin)->postJson('/api/v1/admin/news', $this->payload(['title' => '']))
            ->assertUnprocessable()->assertJsonPath('errors.title.0', 'El campo título es obligatorio.');
        $this->actAs($admin)->postJson('/api/v1/admin/news', $this->payload(['published_date' => 'ayer']))
            ->assertUnprocessable()->assertJsonValidationErrors('published_date');
        $this->actAs($admin)->patchJson('/api/v1/admin/news/999999999', $this->payload())->assertNotFound()
            ->assertJsonPath('message', 'Noticia no encontrada.');
    }

    /** CA-15 */
    public function test_ca15_administration_management_toggles_and_soft_deletes_news(): void
    {
        $admin = $this->createAccount('admin');
        $news = $this->createNews();

        $this->actAs($admin)->patchJson("/api/v1/admin/news/{$news->id}/status", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertFalse((bool) DB::table('news')->where('id', $news->id)->value('is_active'));
        $this->actAs($admin)->patchJson("/api/v1/admin/news/{$news->id}/status", ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);
        $this->actAs($admin)->patchJson("/api/v1/admin/news/{$news->id}/status", [])->assertUnprocessable();

        $this->actAs($admin)->deleteJson("/api/v1/admin/news/{$news->id}")->assertNoContent();

        $this->assertNotNull(DB::table('news')->where('id', $news->id)->value('deleted_at'));
        $ids = collect($this->actAs($admin)->getJson('/api/v1/admin/news')->json('data'))->pluck('id');
        $this->assertNotContains($news->id, $ids->all());
        $this->actAs($admin)->deleteJson("/api/v1/admin/news/{$news->id}")->assertNotFound();
    }

    /** CA-16 */
    public function test_ca16_administration_management_denies_news_operations_without_permission(): void
    {
        $executive = $this->createAccount('executive');
        $this->actAs($executive);

        foreach ([
            ['getJson', '/api/v1/admin/news'],
            ['postJson', '/api/v1/admin/news'],
            ['patchJson', '/api/v1/admin/news/1'],
            ['patchJson', '/api/v1/admin/news/1/status'],
            ['deleteJson', '/api/v1/admin/news/1'],
        ] as [$method, $uri]) {
            $this->{$method}($uri, [])->assertForbidden()
                ->assertJsonPath('message', 'No tienes permiso para realizar esta acción.');
        }

        $this->actAs($this->createAccount('zoo-admin'))->getJson('/api/v1/admin/news')->assertOk();
    }
}
