<?php

namespace App\Http\Requests\Admin;

class SaveNewsRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'content' => ['required', 'string', 'max:20000'],
            'category' => ['required', 'string', 'max:100'],
            'published_date' => ['required', 'date_format:Y-m-d'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => array_merge(
                ['nullable', 'date_format:Y-m-d'],
                $this->filled('start_date') ? ['after_or_equal:start_date'] : [],
            ),
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
