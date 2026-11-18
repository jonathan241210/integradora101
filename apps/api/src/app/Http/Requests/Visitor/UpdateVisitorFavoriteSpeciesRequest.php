<?php

namespace App\Http\Requests\Visitor;

class UpdateVisitorFavoriteSpeciesRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'favorite' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'favorite.required' => 'El favorito debe ser sí o no.',
            'favorite.boolean' => 'El favorito debe ser sí o no.',
        ];
    }

    public function favorite(): bool
    {
        return $this->boolean('favorite');
    }
}
