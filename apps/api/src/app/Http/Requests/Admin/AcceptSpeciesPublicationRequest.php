<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\JsonFormRequest;
use Illuminate\Contracts\Validation\Validator;

class AcceptSpeciesPublicationRequest extends JsonFormRequest
{
    public function rules(): array
    {
        return [];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->exists('publish') && ! is_bool($this->input('publish'))
                    && ! in_array($this->input('publish'), [0, 1, '0', '1', 'true', 'false'], true)) {
                    $validator->errors()->add('publish', 'Indica si se publica o no.');
                }
            },
        ];
    }

    /** Null when the body does not carry `publish`; the Action applies the default (CA-08). */
    public function publishFlag(): ?bool
    {
        return $this->exists('publish') ? $this->boolean('publish') : null;
    }
}
