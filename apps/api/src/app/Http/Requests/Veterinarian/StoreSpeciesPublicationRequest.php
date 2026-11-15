<?php

namespace App\Http\Requests\Veterinarian;

use App\Actions\SpeciesPublication\DeriveSpeciesPublicationStatusAction;
use App\Enums\PublicationStatus;
use App\Enums\SpeciesCategory;
use App\Http\Requests\Concerns\ValidatesPublishedFields;
use App\Http\Requests\JsonFormRequest;
use App\Models\Species;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;

class StoreSpeciesPublicationRequest extends JsonFormRequest
{
    use ValidatesPublishedFields;

    private const FORBIDDEN_FIELDS = ['common_name', 'species'];

    public function rules(): array
    {
        $image = ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:5120'];

        if ($this->isFirstPublication()) {
            array_unshift($image, 'required');
        }

        return [
            'species_id' => ['required', 'integer', Rule::exists('species', 'id')->whereNull('deleted_at')],
            'scientific_name' => ['nullable', 'string', 'max:150'],
            'habitat' => ['nullable', 'string', 'max:150'],
            'origin' => ['nullable', 'string', 'max:150'],
            'category' => ['required', 'string', Rule::in(SpeciesCategory::values())],
            'published_fields' => ['nullable'],
            'image' => $image,
        ];
    }

    public function messages(): array
    {
        $photo = 'No se pudo procesar la foto. Intenta con otro archivo.';

        return [
            'species_id.required' => 'Elige una especie.',
            'species_id.integer' => 'La especie no existe.',
            'species_id.exists' => 'La especie no existe.',
            'scientific_name.max' => 'Nombre científico: máximo 150 caracteres.',
            'scientific_name.string' => 'Nombre científico: máximo 150 caracteres.',
            'habitat.max' => 'Hábitat: máximo 150 caracteres.',
            'habitat.string' => 'Hábitat: máximo 150 caracteres.',
            'origin.max' => 'Área de distribución natural: máximo 150 caracteres.',
            'origin.string' => 'Área de distribución natural: máximo 150 caracteres.',
            'category.required' => 'Tipo de animal requerido.',
            'category.string' => 'Tipo de animal no válido.',
            'category.in' => 'Tipo de animal no válido.',
            'image.required' => 'Elige una foto para la primera publicación.',
            'image.file' => $photo,
            'image.image' => $photo,
            'image.mimes' => $photo,
            'image.max' => $photo,
            'image.uploaded' => $photo,
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                foreach (self::FORBIDDEN_FIELDS as $field) {
                    if ($this->has($field)) {
                        $validator->errors()->add($field, "Campo no permitido: {$field}.");
                    }
                }

                $this->validatePublishedFields($validator);
            },
        ];
    }

    /** The photo is mandatory only for a first publication (CA-04). */
    private function isFirstPublication(): bool
    {
        $id = $this->input('species_id');

        if (! is_numeric($id)) {
            return false;
        }

        $species = Species::query()->find((int) $id);

        if ($species === null) {
            return false;
        }

        return app(DeriveSpeciesPublicationStatusAction::class)->execute($species) === PublicationStatus::NotPublished;
    }
}
