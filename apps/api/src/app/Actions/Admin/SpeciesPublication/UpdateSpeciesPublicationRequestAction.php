<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Admin\SpeciesPublication\Concerns\LocksSpeciesPublication;
use App\Actions\SpeciesPublication\Audit\LogSpeciesPublicationAction;
use App\Actions\SpeciesPublication\Media\DeleteManagedSpeciesImageAction;
use App\Actions\SpeciesPublication\Media\StoreSpeciesImageAction;
use App\Models\Species;
use App\Models\SpeciesPublicationRequest;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Throwable;

class UpdateSpeciesPublicationRequestAction
{
    use LocksSpeciesPublication;

    public function __construct(
        private readonly StoreSpeciesImageAction $storeImage,
        private readonly DeleteManagedSpeciesImageAction $deleteImage,
        private readonly LogSpeciesPublicationAction $audit,
    ) {}

    /**
     * @param  array<string, ?string>  $data  present text fields and category, already trimmed (CA-15)
     * @param  list<string>|null  $publishedFields  null when the body does not carry the field (CA-22)
     */
    public function execute(User $admin, int $requestId, array $data, ?array $publishedFields, ?UploadedFile $image): SpeciesPublicationRequest
    {
        // The new photo is written before the transaction and removed if anything fails (CA-23).
        $newPath = $image !== null ? $this->storeImage->execute($image) : null;

        try {
            [$request, $previousPath] = DB::transaction(
                fn () => $this->update($admin, $requestId, $data, $publishedFields, $newPath),
            );
        } catch (Throwable $e) {
            $this->deleteImage->execute($newPath);

            throw $e;
        }

        // The previous file is removed only after the commit (CA-39).
        if ($newPath !== null) {
            $this->deleteImage->execute($previousPath);
        }

        return $request;
    }

    /** @return array{0: SpeciesPublicationRequest, 1: ?string} */
    private function update(User $admin, int $requestId, array $data, ?array $publishedFields, ?string $newPath): array
    {
        [$species, $request] = $this->lockRequest($requestId);
        $this->assertSubmitted($request);

        $before = [];
        $after = [];

        foreach ($data as $field => $value) {
            $new = $this->correction($field, $value, $species);

            if ($new !== $request->{$field}) {
                $before[$field] = $request->{$field};
                $after[$field] = $new;
            }
        }

        if ($publishedFields !== null && $this->sorted($publishedFields) !== $this->sorted($request->published_fields ?? [])) {
            $before['published_fields'] = $request->published_fields;
            $after['published_fields'] = $publishedFields;
        }

        $previousPath = $request->image_path;

        if ($after === [] && $newPath === null) {
            return [$request, null];
        }

        $request->fill($after);
        if ($newPath !== null) {
            $request->image_path = $newPath;
        }
        $request->updated_by = $admin->id;
        $request->save();

        if ($after !== []) {
            $this->audit->execute(
                'species_publication.edited',
                'Solicitud de publicación editada por '.$admin->full_name,
                $request,
                ['species_id' => $species->id, 'old' => $before, 'new' => $after],
            );
        }

        if ($newPath !== null) {
            $this->audit->execute(
                'species_publication.photo_replaced',
                'Foto de solicitud de publicación reemplazada por '.$admin->full_name,
                $request,
                ['species_id' => $species->id],
            );
        }

        return [$request, $previousPath];
    }

    /** An empty value or one equal to the current species value is stored as NULL: no correction (CA-30). */
    private function correction(string $field, ?string $value, Species $species): ?string
    {
        $current = $field === 'origin' ? $species->distribution : $species->{$field};

        if ($value === null || $value === '' || $value === $current) {
            return null;
        }

        return $value;
    }

    /** @param  list<string>  $fields */
    private function sorted(array $fields): array
    {
        sort($fields);

        return array_values($fields);
    }
}
