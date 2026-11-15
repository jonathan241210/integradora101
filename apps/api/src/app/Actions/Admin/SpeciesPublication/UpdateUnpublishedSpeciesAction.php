<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Actions\SpeciesPublication\Media\StoreSpeciesImageAction;
use App\Enums\PublicationStatus;
use App\Models\User;
use App\Support\SpeciesMedia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class UpdateUnpublishedSpeciesAction
{
    use LocksSpeciesPublication;

    public function __construct(
        private readonly DeriveSpeciesPublicationStatusAction $derive,
        private readonly StoreSpeciesImageAction $storeImage,
        private readonly DeleteManagedSpeciesImageAction $deleteImage,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    /**
     * Edits the sheet of an unpublished species directly; never publishes (CA-37).
     *
     * @param  array<string, ?string>  $data
     * @param  list<string>|null  $publishedFields
     */
    public function execute(User $admin, int $speciesId, array $data, ?array $publishedFields, ?UploadedFile $image): void
    {
        $newPath = $image !== null ? $this->storeImage->execute($image, SpeciesMedia::PUBLIC_FOLDER) : null;

        try {
            $previousPath = DB::transaction(
                fn () => $this->update($admin, $speciesId, $data, $publishedFields, $newPath),
            );
        } catch (Throwable $e) {
            $this->deleteImage->execute($newPath);

            throw $e;
        }

        if ($newPath !== null) {
            $this->deleteImage->execute($previousPath);
        }
    }

    private function update(User $admin, int $speciesId, array $data, ?array $publishedFields, ?string $newPath): ?string
    {
        $species = $this->lockSpecies($speciesId);

        $message = match ($this->derive->execute($species)) {
            PublicationStatus::Unpublished => null,
            PublicationStatus::Published => 'Despublica la especie antes de editar su ficha pública.',
            PublicationStatus::NotPublished => 'Esta especie no tiene una ficha publicada que editar.',
            PublicationStatus::Pending => 'Hay una solicitud pendiente para esta especie. Decide sobre ella antes de editar.',
        };

        if ($message !== null) {
            throw ValidationException::withMessages(['species' => [$message]]);
        }

        $before = [];
        $after = [];

        foreach ($data as $field => $value) {
            $column = $field === 'origin' ? 'distribution' : $field;

            if ($species->{$column} !== $value) {
                $before[$field] = $species->{$column};
                $after[$field] = $value;
                $species->{$column} = $value;
            }
        }

        if ($publishedFields !== null && $this->sorted($publishedFields) !== $this->sorted($species->published_fields ?? [])) {
            $before['published_fields'] = $species->published_fields;
            $after['published_fields'] = $publishedFields;
            $species->published_fields = $publishedFields;
        }

        $previousPath = $species->image_path;

        if ($newPath !== null) {
            $species->image_path = $newPath;
            $after['image_replaced'] = true;
        }

        if ($after === []) {
            return null;
        }

        $species->save();

        $this->audit->execute(
            'species_publication.unpublished_edited',
            'Ficha de especie despublicada editada por '.$admin->full_name,
            $species,
            ['old' => $before, 'new' => $after],
        );

        return $previousPath;
    }

    /** @param  list<string>  $fields */
    private function sorted(array $fields): array
    {
        sort($fields);

        return array_values($fields);
    }
}
