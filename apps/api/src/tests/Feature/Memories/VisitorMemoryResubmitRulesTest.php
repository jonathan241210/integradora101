<?php

namespace Tests\Feature\Memories;

use App\Models\Visitor;
use App\Models\VisitorMemory;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemoryResubmitRulesTest extends VisitorFeatureTestCase
{
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    /** Rechazada por foto: image_path ya es NULL y se conserva el SHA-256 de la rechazada. */
    private function imageRejected(Visitor $visitor, bool $alsoContent = false): VisitorMemory
    {
        return $this->memoryOf($visitor, 'rejected', [
            'image_path' => null, 'image_sha256' => $this->cleanSha('jpeg', 1), 'opinion' => 'Opinión guardada',
            'rejection_reason' => 'Foto no válida', 'rejected_image' => true, 'rejected_content' => $alsoContent,
        ]);
    }

    /** CA-27 */
    public function test_ca27_image_rejection_requires_different_photo_hash(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->imageRejected($visitor);

        // Sin archivo.
        $this->resubmitMemory($token, $memory->id)->assertStatus(422)->assertJsonValidationErrors('image');

        // Misma foto (mismos píxeles, otro nombre): el hash del archivo limpio coincide.
        $this->resubmitMemory($token, $memory->id, ['image' => $this->memoryImage('jpeg', 1, null, 'otra-cosa.jpg')])
            ->assertStatus(422)
            ->assertJsonPath('errors.image.0', 'Sube una foto distinta a la que fue rechazada.');

        $this->assertSame('rejected', $memory->fresh()->status);
        $this->assertSame(0, (int) $memory->fresh()->resubmitted_count);
        $this->assertSame([], $disk->allFiles());

        // Foto distinta: pasa; opinión no enviada se conserva (D-M12).
        $this->resubmitMemory($token, $memory->id, ['image' => $this->memoryImage('jpeg', 2)])
            ->assertOk()->assertJsonPath('data.opinion', 'Opinión guardada');

        $fresh = $memory->fresh();
        $this->assertSame($this->cleanSha('jpeg', 2), $fresh->image_sha256);
        $this->assertTrue($disk->exists($fresh->image_path));
        $this->assertSame('submitted', $fresh->status);
    }

    /** CA-27 */
    public function test_ca27_content_rejection_requires_changed_opinion(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, [
            'visitor_id' => $visitor->id, 'opinion' => 'Opinión guardada', 'rejection_reason' => 'Texto', 'rejected_content' => true,
        ], 'rejected');
        $message = 'Cambia la opinión antes de reenviarla.';

        foreach ([[], ['opinion' => 'Opinión guardada'], ['opinion' => '  Opinión guardada  '], ['opinion' => '']] as $data) {
            $this->resubmitMemory($token, $memory->id, $data)
                ->assertStatus(422)->assertJsonPath('errors.opinion.0', $message);
        }

        $this->assertSame('rejected', $memory->fresh()->status);
        $this->assertSame('Opinión guardada', $memory->fresh()->opinion);

        $this->resubmitMemory($token, $memory->id, ['opinion' => ' Opinión nueva '])
            ->assertOk()->assertJsonPath('data.opinion', 'Opinión nueva');
    }

    /** CA-27 */
    public function test_ca27_content_only_keeps_or_replaces_image_and_deletes_previous_after_commit(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        // Solo content: la imagen es opcional; sin ella se conserva el archivo.
        $keep = $this->createMemoryWithFile($disk, ['visitor_id' => $visitor->id, 'opinion' => 'Uno', 'rejected_content' => true, 'rejection_reason' => 'x'], 'rejected');
        $keepPath = $keep->image_path;
        $this->resubmitMemory($token, $keep->id, ['opinion' => 'Dos'])->assertOk();
        $this->assertSame($keepPath, $keep->fresh()->image_path);
        $this->assertTrue($disk->exists($keepPath));

        // Con imagen nueva: sustituye y el anterior se borra tras el commit.
        $replace = $this->createMemoryWithFile($disk, ['visitor_id' => $visitor->id, 'opinion' => 'Uno', 'rejected_content' => true, 'rejection_reason' => 'x'], 'rejected');
        $oldPath = $replace->image_path;
        $this->resubmitMemory($token, $replace->id, ['opinion' => 'Dos', 'image' => $this->memoryImage('png', 9)])->assertOk();

        $fresh = $replace->fresh();
        $this->assertNotSame($oldPath, $fresh->image_path);
        $this->assertTrue($disk->exists($fresh->image_path));
        $this->assertFalse($disk->exists($oldPath));
        $this->assertSame($this->cleanSha('png', 9), $fresh->image_sha256);
    }

    /** CA-27 (RN-16): si el archivo nuevo no se puede escribir, nada cambia y el anterior no se borra. */
    public function test_ca27_failed_write_changes_nothing_and_keeps_previous_file(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->createMemoryWithFile($disk, ['visitor_id' => $visitor->id, 'opinion' => 'Uno', 'rejected_content' => true, 'rejection_reason' => 'x'], 'rejected');
        $oldPath = $memory->image_path;

        $failing = Mockery::mock(Filesystem::class);
        $failing->shouldReceive('put')->once()->andReturn(false);
        $failing->shouldReceive('delete')->never();
        Storage::set(config('filesystems.media_scopes.private'), $failing);

        $this->resubmitMemory($token, $memory->id, ['opinion' => 'Dos', 'image' => $this->memoryImage('png', 9)])->assertStatus(500);

        $fresh = $memory->fresh();
        $this->assertSame('rejected', $fresh->status);
        $this->assertSame('Uno', $fresh->opinion);
        $this->assertSame($oldPath, $fresh->image_path);
        $this->assertSame(0, (int) $fresh->resubmitted_count);
        $this->assertTrue($disk->exists($oldPath));
    }

    /** CA-27: con ambos campos marcados se exigen foto distinta y opinión distinta. */
    public function test_ca27_both_fields_rejected_requires_both_corrections(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $memory = $this->imageRejected($visitor, true);

        $response = $this->resubmitMemory($token, $memory->id, ['image' => $this->memoryImage('jpeg', 1)])->assertStatus(422);
        $response->assertJsonValidationErrors(['image', 'opinion']);
        $this->assertSame([], $disk->allFiles());

        $this->resubmitMemory($token, $memory->id, ['image' => $this->memoryImage('jpeg', 5), 'opinion' => 'Otra opinión'])->assertOk();
    }
}
