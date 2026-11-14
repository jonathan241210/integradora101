<?php

namespace App\Http\Requests\Visitor;

/** Reenvío de una rechazada (api-010 CA-26, CA-27): la imagen es opcional; las reglas de estado van en la Action. */
class ResubmitVisitorMemoryRequest extends StoreVisitorMemoryRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }
}
