<?php

namespace Tests\Feature\SpeciesPublication;

use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\SeedsRolesWhenMissing;
use Tests\FeatureTestCase;

abstract class SpeciesPublicationTestCase extends FeatureTestCase
{
    use CreatesAdministrators;
    use SeedsRolesWhenMissing;

    protected const VET_SPECIES = '/api/v1/veterinarian/species';

    protected const VET_REQUESTS = '/api/v1/veterinarian/species-publication-requests';

    protected const ADMIN_REQUESTS = '/api/v1/admin/species-publication-requests';

    protected const ADMIN_SPECIES = '/api/v1/admin/species';

    protected const ADMIN_PUBLISHED = '/api/v1/admin/published-species';

    protected function setUp(): void
    {
        parent::setUp();

        // Both scopes point to the fake shared folder (api-013 CA-02).
        config(['filesystems.media_scopes.public' => 'media', 'filesystems.media_scopes.private' => 'media']);
        Storage::fake('media');
    }

    /** Seeds roles only when they or `species.review` are missing (see SeedsRolesWhenMissing). */
    protected function seedRoles(): void
    {
        $this->seedRolesWhenMissing();
    }

    protected function actAs(User $user): static
    {
        Auth::forgetGuards();

        return $this->actingAs($user, 'web');
    }

    protected function zooAdmin(): User
    {
        return $this->createAccount('zoo-admin');
    }

    /** Puts a file in the fake media disk under a managed name and returns its path. */
    protected function putMedia(string $folder, string $content = 'binary'): string
    {
        $path = $folder.'/'.Str::uuid()->toString().'.jpg';
        Storage::disk('media')->put($path, $content);

        return $path;
    }

    protected function veterinarian(): User
    {
        return $this->createAccount('veterinarian', false);
    }

    protected function makeSpecies(array $attributes = []): Species
    {
        return Species::query()->create(array_merge([
            'common_name' => 'Especie '.bin2hex(random_bytes(4)),
            'scientific_name' => 'Scientificus testus',
            'is_published' => false,
        ], $attributes));
    }

    protected function makePublishedSpecies(array $attributes = []): Species
    {
        return $this->makeSpecies(array_merge([
            'is_published' => true,
            'published_at' => now()->subDay(),
            'image_path' => 'species/'.'11111111-1111-1111-1111-111111111111.jpg',
            'published_fields' => ['scientific_name', 'origin', 'habitat'],
            'category' => 'mammal',
        ], $attributes));
    }

    protected function makeUnpublishedSpecies(array $attributes = []): Species
    {
        return $this->makePublishedSpecies(array_merge([
            'is_published' => false,
            'unpublished_at' => now()->subHour(),
        ], $attributes));
    }

    protected function makeRequest(Species $species, User $creator, SpeciesRequestStatus $status = SpeciesRequestStatus::Submitted, array $attributes = []): SpeciesPublicationRequest
    {
        $request = new SpeciesPublicationRequest(array_merge([
            'species_id' => $species->id,
            'request_type' => SpeciesRequestType::Publish,
            'published_fields' => ['scientific_name', 'origin', 'habitat'],
            'created_by' => $creator->id,
        ], $attributes));
        $request->status = $status;
        $request->save();

        return $request->refresh();
    }

    protected function jpeg(string $name = 'photo.jpg'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 40, 40);
    }

    protected function png(string $name = 'photo.png'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 40, 40);
    }

    /** A real (non-fake) upload whose content is not an image, even though the name says .jpg. */
    protected function corruptImage(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'arca');
        file_put_contents($path, 'esto no es una imagen');

        return new UploadedFile($path, 'photo.jpg', 'image/jpeg', null, true);
    }

    /** @return array<string, mixed> */
    protected function submission(Species $species, array $override = []): array
    {
        return array_merge([
            'species_id' => $species->id,
            'category' => 'mammal',
            'image' => $this->jpeg(),
        ], $override);
    }

    protected function submit(User $user, array $payload)
    {
        return $this->actAs($user)->post(self::VET_REQUESTS, $payload, ['Accept' => 'application/json']);
    }

    /** @return list<string> */
    protected function storedFiles(): array
    {
        return Storage::disk('media')->allFiles();
    }
}
