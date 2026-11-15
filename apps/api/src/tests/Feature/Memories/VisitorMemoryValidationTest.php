<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use Illuminate\Http\UploadedFile;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemoryValidationTest extends VisitorFeatureTestCase
{
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    private const IMAGE_MESSAGE = 'La foto debe ser JPG, PNG o WebP de máximo 5 MB.';

    /** CA-02 */
    public function test_ca02_invalid_file_returns_422_and_writes_nothing(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        $truncated = substr($this->memoryImageBytes(), 0, -40);
        $cases = [
            'pdf' => $this->realUpload("%PDF-1.4\n%fake\n", 'doc.pdf'),
            'text renamed as jpg' => $this->realUpload('esto no es una imagen', 'nota.jpg'),
            'gif' => $this->realUpload(base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), 'anim.gif'),
            'svg' => $this->realUpload('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>', 'logo.svg'),
            'over 5 MB' => UploadedFile::fake()->image('grande.jpg')->size(5121),
        ];

        foreach ($cases as $label => $file) {
            $response = $this->submitMemory($token, ['image' => $file]);
            $response->assertStatus(422);
            $this->assertSame(self::IMAGE_MESSAGE, $response->json('errors.image.0'), $label);
        }

        $this->submitMemory($token, ['image' => null])->assertStatus(422)->assertJsonValidationErrors('image');

        // Pasa las reglas de formato pero el contenedor está truncado: no se puede procesar.
        $this->submitMemory($token, ['image' => $this->memoryImage('jpeg', 1, $truncated)])
            ->assertStatus(422)
            ->assertJsonPath('errors.image.0', 'No se pudo procesar la foto. Intenta con otro archivo.');

        $this->assertNothingStored($disk, $visitor->id);
    }

    /** CA-02 */
    public function test_ca02_valid_formats_are_accepted_and_resubmit_rejects_invalid_image(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        foreach (['jpeg', 'png', 'webp'] as $index => $format) {
            $memory = $this->memoryOf($visitor, 'rejected', ['rejected_content' => true, 'opinion' => 'Anterior']);
            $this->resubmitMemory($token, $memory->id, ['opinion' => 'Nueva '.$index, 'image' => $this->memoryImage($format, $index + 2)])->assertOk();
        }

        $rejected = $this->memoryOf($visitor, 'rejected', ['rejected_content' => true, 'opinion' => 'Anterior']);
        $this->resubmitMemory($token, $rejected->id, [
            'opinion' => 'Cambiada',
            'image' => $this->realUpload('no es imagen', 'nota.jpg'),
        ])->assertStatus(422)->assertJsonPath('errors.image.0', self::IMAGE_MESSAGE);

        $this->assertSame('rejected', $rejected->fresh()->status);
        $this->assertCount(3, $disk->allFiles());
    }

    /** CA-03 */
    public function test_ca03_opinion_over_300_returns_422_in_errors_opinion(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();

        foreach ([str_repeat('a', 301), str_repeat('ñ', 301)] as $opinion) {
            $this->submitMemory($token, ['opinion' => $opinion])
                ->assertStatus(422)
                ->assertJsonPath('errors.opinion.0', 'La opinión puede tener hasta 300 caracteres.');
        }

        $this->assertNothingStored($disk, $visitor->id);
    }

    /** CA-03 */
    public function test_ca03_opinion_is_optional_and_300_characters_are_valid(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();

        $this->submitMemory($token, ['opinion' => str_repeat('ñ', 300)])->assertCreated();
        $this->assertSame(str_repeat('ñ', 300), VisitorMemory::query()->where('visitor_id', $visitor->id)->value('opinion'));
    }

    /** CA-04 */
    public function test_ca04_missing_consent_returns_422_with_spanish_message(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $disk = $this->fakeMemoryDisk();
        $message = 'Confirma que tienes permiso para compartir esta foto y que aceptas los términos.';

        foreach ([['consent' => null], ['consent' => '0'], ['consent' => 'false'], ['consent' => 'no']] as $data) {
            $this->submitMemory($token, $data)->assertStatus(422)->assertJsonPath('errors.consent.0', $message);
        }

        $this->withHeader('Accept', 'application/json')->withVisitorToken($token)
            ->post('/api/v1/visitor/memories', ['image' => $this->memoryImage()])
            ->assertStatus(422)->assertJsonPath('errors.consent.0', $message);

        $this->assertNothingStored($disk, $visitor->id);
    }

    /** CA-04 */
    public function test_ca04_resubmit_also_requires_consent(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $this->fakeMemoryDisk();
        $memory = $this->memoryOf($visitor, 'rejected', ['rejected_content' => true, 'opinion' => 'Anterior']);

        $this->resubmitMemory($token, $memory->id, ['opinion' => 'Nueva', 'consent' => null])
            ->assertStatus(422)
            ->assertJsonPath('errors.consent.0', 'Confirma que tienes permiso para compartir esta foto y que aceptas los términos.');

        $this->assertSame('rejected', $memory->fresh()->status);
    }
}
