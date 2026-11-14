<?php

namespace App\Http\Requests\Admin\Concerns;

use App\Enums\SpeciesCategory;
use App\Http\Requests\Concerns\ValidatesPublishedFields;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;

/** Shared validation of the editable fields of a request or of an unpublished species sheet (CA-15, CA-16, CA-37). */
trait ValidatesSpeciesSheetEdit
{
    use ValidatesPublishedFields;

    /** @var list<string> */
    private const TEXT_FIELDS = ['scientific_name', 'habitat', 'origin'];

    /** @var list<string> */
    private const EDITABLE = ['scientific_name', 'habitat', 'origin', 'category', 'published_fields', 'image'];

    public function rules(): array
    {
        return [
            'scientific_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'habitat' => ['sometimes', 'nullable', 'string', 'max:150'],
            'origin' => ['sometimes', 'nullable', 'string', 'max:150'],
            'category' => ['sometimes', 'required', 'string', Rule::in(SpeciesCategory::values())],
            'published_fields' => ['sometimes', 'nullable'],
            'image' => ['sometimes', 'file', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        $photo = 'No se pudo procesar la foto. Intenta con otro archivo.';

        return [
            'scientific_name.max' => 'Nombre científico: máximo 150 caracteres.',
            'scientific_name.string' => 'Nombre científico: máximo 150 caracteres.',
            'habitat.max' => 'Hábitat: máximo 150 caracteres.',
            'habitat.string' => 'Hábitat: máximo 150 caracteres.',
            'origin.max' => 'Área de distribución natural: máximo 150 caracteres.',
            'origin.string' => 'Área de distribución natural: máximo 150 caracteres.',
            'category.required' => 'Tipo de animal requerido.',
            'category.string' => 'Tipo de animal no válido.',
            'category.in' => 'Tipo de animal no válido.',
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
                $keys = array_keys($this->all());
                $unknown = array_values(array_diff($keys, [...self::EDITABLE, '_method']));

                if ($unknown !== []) {
                    $validator->errors()->add($unknown[0], "Campo no editable: {$unknown[0]}.");

                    return;
                }

                if (array_diff($keys, ['_method']) === []) {
                    $validator->errors()->add('body', 'Nada que guardar.');

                    return;
                }

                $this->validatePublishedFields($validator);
            },
        ];
    }

    /**
     * Present text fields and category, trimmed. An empty text value is null.
     *
     * @return array<string, ?string>
     */
    public function editableData(): array
    {
        $data = [];

        foreach (self::TEXT_FIELDS as $field) {
            if ($this->exists($field)) {
                $value = trim((string) $this->input($field));
                $data[$field] = $value === '' ? null : $value;
            }
        }

        if ($this->exists('category')) {
            $data['category'] = trim((string) $this->input('category'));
        }

        return $data;
    }
}
