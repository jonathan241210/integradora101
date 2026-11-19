<?php

namespace App\Http\Requests\Admin;

class GlobalSearchRequest extends AdminFormRequest
{
    private const MESSAGE = 'Escribe entre 2 y 100 caracteres para buscar.';

    protected function prepareForValidation(): void
    {
        $q = $this->query('q');

        $this->merge(['q' => is_string($q) ? trim($q) : $q]);
    }

    public function rules(): array
    {
        return ['q' => ['required', 'string', 'min:2', 'max:100']];
    }

    public function messages(): array
    {
        return [
            'q.required' => self::MESSAGE,
            'q.string' => self::MESSAGE,
            'q.min' => self::MESSAGE,
            'q.max' => self::MESSAGE,
        ];
    }

    public function term(): string
    {
        return (string) $this->validated('q');
    }
}
