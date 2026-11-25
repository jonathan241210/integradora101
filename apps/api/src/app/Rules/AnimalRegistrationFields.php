<?php

namespace App\Rules;

final class AnimalRegistrationFields
{
    public static function rules(): array
    {
        return [
            'can_receive_visits' => ['sometimes', 'required', 'boolean'],
        ];
    }

    public static function messages(): array
    {
        return [
            'can_receive_visits.required' => 'Indica si el animal puede recibir visitas.',
            'can_receive_visits.boolean' => 'Selecciona Sí o No para las visitas.',
        ];
    }

    public static function attributes(array $validated): array
    {
        $attributes = [];

        if (array_key_exists('can_receive_visits', $validated)) {
            $attributes['can_receive_visits'] = (int) $validated['can_receive_visits'];
        }

        return $attributes;
    }
}
