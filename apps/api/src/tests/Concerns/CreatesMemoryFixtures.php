<?php

namespace Tests\Concerns;

use App\Models\User;
use App\Models\VisitorMemory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Fixtures de api-010. Requiere CreatesAdministrators.
 * createAccount() ejecuta RolesAndPermissionsSeeder, que ya da memories.review a zoo-admin.
 */
trait CreatesMemoryFixtures
{
    protected function createMemoryStaff(string $role = 'zoo-admin', bool $twoFactor = true): User
    {
        return $this->createAccount($role, $twoFactor);
    }

    protected function createMemory(array $attributes = [], string $status = 'submitted'): VisitorMemory
    {
        $memory = new VisitorMemory(array_merge([
            'opinion' => 'Un día inolvidable',
            'image_path' => 'memories/'.fake()->uuid().'.jpg',
            'image_sha256' => hash('sha256', random_bytes(8)),
            'consent_at' => now(),
            'terms_version' => 'v1',
        ], $attributes));
        $memory->forceFill(['status' => $status])->save();

        return $memory->refresh();
    }

    /** Disco privado de medios (nombre de la configuración de api-013) sustituido por un fake. */
    protected function fakeMemoryDisk(): Filesystem
    {
        $name = config('filesystems.media_scopes.private');
        Storage::fake($name);

        return Storage::disk($name);
    }

    /** Crea una petición cuyo archivo existe en el disco fake. */
    protected function createMemoryWithFile(Filesystem $disk, array $attributes = [], string $status = 'submitted'): VisitorMemory
    {
        $path = 'memories/'.fake()->uuid().'.jpg';
        $disk->put($path, 'binary-'.hash('sha256', $path));

        return $this->createMemory(array_merge(['image_path' => $path], $attributes), $status);
    }
}
