<?php

namespace App\Http\Requests\Concerns;

use App\Enums\PublishedSpeciesField;
use Illuminate\Contracts\Validation\Validator;

/** Shared parsing and validation of `published_fields` (CA-21, RN-13). */
trait ValidatesPublishedFields
{
    /**
     * @return list<string>|false|null null = field absent; false = malformed; list = deduplicated keys
     */
    protected function parsedPublishedFields(): array|false|null
    {
        if (! $this->has('published_fields')) {
            return null;
        }

        $raw = $this->input('published_fields');

        if ($raw === null || $raw === '') {
            return [];
        }

        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;

        if (! is_array($decoded) || ! array_is_list($decoded)) {
            return false;
        }

        foreach ($decoded as $key) {
            if (! is_string($key)) {
                return false;
            }
        }

        return array_values(array_unique($decoded));
    }

    protected function validatePublishedFields(Validator $validator): void
    {
        $fields = $this->parsedPublishedFields();

        if ($fields === false) {
            $validator->errors()->add('published_fields', 'La selección de campos públicos no es válida.');

            return;
        }

        foreach ($fields ?? [] as $key) {
            if (! in_array($key, PublishedSpeciesField::implementedValues(), true)) {
                $validator->errors()->add('published_fields', "Campo no permitido en la ficha pública: {$key}.");

                return;
            }
        }
    }

    /**
     * Normalized selection, or null when the request does not carry the field.
     *
     * @return list<string>|null
     */
    public function publishedFields(): ?array
    {
        $fields = $this->parsedPublishedFields();

        return $fields === false ? null : $fields;
    }
}
