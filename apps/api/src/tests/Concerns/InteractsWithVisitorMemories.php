<?php

namespace Tests\Concerns;

use App\Actions\Memories\Media\StoreMemoryImageAction;
use App\Models\Visitor;
use App\Models\VisitorMemory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/**
 * Apoyo de las pruebas del visitante de api-010. Requiere RegistersVisitors y CreatesMemoryFixtures.
 * Las imágenes se generan con GD (sin metadatos reales ni fotos de personas).
 */
trait InteractsWithVisitorMemories
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    /** @return array{0: string, 1: Visitor} token de acceso y visitante verificado */
    protected function memoryVisitor(): array
    {
        $session = $this->verifiedVisitor();

        return [$session['access_token'], Visitor::query()->where('email', $session['email'])->firstOrFail()];
    }

    /** Genera una imagen pequeña; `seed` cambia los píxeles y por tanto el SHA-256. */
    protected function memoryImageBytes(string $format = 'jpeg', int $seed = 1): string
    {
        $image = imagecreatetruecolor(8, 8);
        imagefilledrectangle($image, 0, 0, 7, 7, imagecolorallocate($image, ($seed * 37) % 256, ($seed * 91) % 256, ($seed * 53) % 256));
        imagesetpixel($image, $seed % 8, ($seed * 3) % 8, imagecolorallocate($image, 255, 255, 255));

        ob_start();
        match ($format) {
            'png' => imagepng($image),
            'webp' => imagewebp($image),
            default => imagejpeg($image, null, 90),
        };

        return (string) ob_get_clean();
    }

    protected function memoryImage(string $format = 'jpeg', int $seed = 1, ?string $bytes = null, ?string $name = null): UploadedFile
    {
        $extension = $format === 'jpeg' ? 'jpg' : $format;

        return UploadedFile::fake()->createWithContent($name ?? "recuerdo.{$extension}", $bytes ?? $this->memoryImageBytes($format, $seed));
    }

    /** Subida real (el MIME sale del contenido, no del nombre, como en producción). */
    protected function realUpload(string $content, string $name): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'mem');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, null, null, true);
    }

    /** SHA-256 del archivo limpio, igual que lo guarda la API. */
    protected function cleanSha(string $format = 'jpeg', int $seed = 1): string
    {
        return app(StoreMemoryImageAction::class)
            ->prepare($this->memoryImage($format, $seed))['sha256'];
    }

    protected function submitMemory(string $token, array $data = []): TestResponse
    {
        return $this->withHeader('Accept', 'application/json')
            ->withVisitorToken($token)
            ->post('/api/v1/visitor/memories', array_merge([
                'image' => $this->memoryImage(),
                'opinion' => 'Un día inolvidable',
                'consent' => '1',
            ], $data));
    }

    protected function resubmitMemory(string $token, int|string $id, array $data = []): TestResponse
    {
        return $this->withHeader('Accept', 'application/json')
            ->withVisitorToken($token)
            ->post("/api/v1/visitor/memories/{$id}/resubmit", array_merge(['consent' => '1'], $data));
    }

    protected function memoryOf(Visitor $visitor, string $status = 'submitted', array $attributes = [], ?Carbon $createdAt = null): VisitorMemory
    {
        $memory = $this->createMemory(array_merge(['visitor_id' => $visitor->id], $attributes), $status);

        if ($createdAt !== null) {
            VisitorMemory::query()->whereKey($memory->id)->update(['created_at' => $createdAt]);
            $memory->refresh();
        }

        return $memory;
    }

    protected function assertNothingStored($disk, ?int $visitorId = null): void
    {
        $this->assertSame([], $disk->allFiles());

        if ($visitorId !== null) {
            $this->assertSame(0, VisitorMemory::withTrashed()->where('visitor_id', $visitorId)->count());
        }
    }
}
