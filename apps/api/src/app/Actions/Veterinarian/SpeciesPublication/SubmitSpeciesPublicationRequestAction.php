<?php

namespace App\Actions\Veterinarian\SpeciesPublication;

use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Actions\SpeciesPublication\Media\StoreSpeciesImageAction;
use App\Enums\PublicationStatus;
use App\Enums\PublishedSpeciesField;
use App\Enums\SpeciesRequestStatus;
use App\Enums\SpeciesRequestType;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class SubmitSpeciesPublicationRequestAction
{
    private const UNIQUE_INDEX = 'uq_species_publication_requests_submitted_species';

    private const PENDING_MESSAGE = 'Ya hay una solicitud pendiente para esta especie.';

    public function __construct(
        private readonly DeriveSpeciesPublicationStatusAction $derive,
        private readonly StoreSpeciesImageAction $storeImage,
        private readonly DeleteManagedSpeciesImageAction $deleteImage,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    /**
     * @param  array{species_id: int|string, scientific_name?: ?string, habitat?: ?string, origin?: ?string, category: string, published_fields?: ?list<string>}  $data
     */
    public function execute(User $user, array $data, ?UploadedFile $image): SpeciesPublicationRequest
    {
        // The photo is written before the transaction (CA-02); it is removed if anything fails.
        $imagePath = $image !== null ? $this->storeImage->execute($image) : null;

        try {
            return DB::transaction(fn () => $this->submit($user, $data, $imagePath));
        } catch (Throwable $e) {
            $this->deleteImage->execute($imagePath);

            if ($this->isSubmittedUniqueViolation($e)) {
                throw ValidationException::withMessages(['species_id' => [self::PENDING_MESSAGE]]);
            }

            throw $e;
        }
    }

    private function submit(User $user, array $data, ?string $imagePath): SpeciesPublicationRequest
    {
        $species = Species::query()->lockForUpdate()->find((int) $data['species_id']);

        if ($species === null) {
            throw ValidationException::withMessages(['species_id' => ['La especie no existe.']]);
        }

        $status = $this->derive->execute($species);

        if ($status === PublicationStatus::Pending) {
            throw ValidationException::withMessages(['species_id' => [self::PENDING_MESSAGE]]);
        }

        $type = $status->nextRequestType();

        if ($type === SpeciesRequestType::Publish && $imagePath === null) {
            throw ValidationException::withMessages(['image' => ['Elige una foto para la primera publicación.']]);
        }

        $request = new SpeciesPublicationRequest([
            'species_id' => $species->id,
            'request_type' => $type,
            'scientific_name' => $this->correction($data['scientific_name'] ?? null, $species->scientific_name),
            'habitat' => $this->correction($data['habitat'] ?? null, $species->habitat),
            'origin' => $this->correction($data['origin'] ?? null, $species->distribution),
            'category' => $this->correction($data['category'] ?? null, $species->category),
            'image_path' => $imagePath,
            'published_fields' => $data['published_fields'] ?? PublishedSpeciesField::defaults(),
            'created_by' => $user->id,
        ]);
        $request->status = SpeciesRequestStatus::Submitted;
        $request->save();

        $this->audit->execute(
            'species_publication.submitted',
            'Solicitud de publicación enviada por '.$user->full_name,
            $request,
            ['species_id' => $species->id, 'request_type' => $type->value],
        );

        return $request->refresh();
    }

    /** An empty value or one equal to the current value is stored as NULL: no correction (CA-30). */
    private function correction(?string $value, ?string $current): ?string
    {
        $value = $value === null ? '' : trim($value);

        if ($value === '' || $value === $current) {
            return null;
        }

        return $value;
    }

    private function isSubmittedUniqueViolation(Throwable $e): bool
    {
        return $e instanceof QueryException
            && ($e->errorInfo[1] ?? null) === 1062
            && str_contains($e->getMessage(), self::UNIQUE_INDEX);
    }
}
