<?php

namespace App\Http\Requests\Admin;

use App\Enums\MemoryStatus;
use Illuminate\Validation\Rule;

class ListMemoriesForReviewRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(MemoryStatus::values())],
            'page' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'El estado no es válido.',
            'status.string' => 'El estado no es válido.',
            'page.integer' => 'La página debe ser un número entero mayor o igual que 1.',
            'page.min' => 'La página debe ser un número entero mayor o igual que 1.',
            'limit.integer' => 'El tamaño de página debe estar entre 1 y 50.',
            'limit.min' => 'El tamaño de página debe estar entre 1 y 50.',
            'limit.max' => 'El tamaño de página debe estar entre 1 y 50.',
        ];
    }

    public function status(): ?string
    {
        return $this->validated('status');
    }

    public function page(): int
    {
        return (int) ($this->validated('page') ?? 1);
    }

    public function limit(): int
    {
        return (int) ($this->validated('limit') ?? 10);
    }
}
