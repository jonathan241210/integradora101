<?php

namespace Tests\Concerns;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Fixtures de la búsqueda global (api-019). */
trait BuildsSearchFixtures
{
    protected function tag(): string
    {
        return 'zq'.bin2hex(random_bytes(5));
    }

    /** Administrador con todos los permisos de búsqueda. */
    protected function searchAdmin(): User
    {
        $user = $this->createAccount('admin');
        $user->givePermissionTo(['species.review', 'memories.review']);

        return $user;
    }

    protected function search(User $user, string $q)
    {
        return $this->actAs($user)->getJson('/api/v1/admin/search?q='.rawurlencode($q));
    }

    protected function groupsBySection($response): array
    {
        return collect($response->json('groups'))->keyBy('section')->all();
    }

    protected function makeNews(string $title, bool $active = true, bool $deleted = false, array $extra = []): int
    {
        return DB::table('news')->insertGetId(array_merge([
            'title' => $title,
            'content' => 'Contenido',
            'published_date' => '2026-01-01',
            'category' => 'General',
            'is_active' => $active ? 1 : 0,
            'deleted_at' => $deleted ? now() : null,
        ], $extra));
    }

    protected function makeEvent(string $name, bool $active = true, bool $deleted = false, array $extra = []): int
    {
        return DB::table('events')->insertGetId(array_merge([
            'name' => $name,
            'start_date' => '2026-12-01',
            'is_active' => $active ? 1 : 0,
            'deleted_at' => $deleted ? now() : null,
        ], $extra));
    }

    protected function makeTicket(string $status = 'completed', ?string $purchasedAt = '2026-11-15 12:00:00', bool $deleted = false, array $extra = []): int
    {
        return DB::table('tickets')->insertGetId(array_merge([
            'adult_quantity' => 1,
            'child_quantity' => 0,
            'status' => $status,
            'total_amount' => 50,
            'purchased_at' => $purchasedAt,
            'deleted_at' => $deleted ? now() : null,
        ], $extra));
    }

    protected function makeMemory(string $status = 'in_review', bool $deleted = false, string $opinion = 'Opinión privada', array $extra = []): int
    {
        return DB::table('visitor_memories')->insertGetId(array_merge([
            'status' => $status,
            'opinion' => $opinion,
            'consent_at' => now(),
            'terms_version' => '2026-10',
            'deleted_at' => $deleted ? now() : null,
            'created_at' => now(),
            'updated_at' => now(),
        ], $extra));
    }
}
