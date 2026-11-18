<?php

namespace App\Http\Requests\Visitor;

class UpdateNotificationPreferencesRequest extends VisitorFormRequest
{
    public function rules(): array
    {
        return [
            'news_and_events' => ['sometimes', 'boolean'],
            'memory_status' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'news_and_events.boolean' => 'El aviso de noticias y eventos debe ser sí o no.',
            'memory_status.boolean' => 'El aviso del estado de tus momentos debe ser sí o no.',
        ];
    }

    /**
     * @return array{news_and_events?: bool, memory_status?: bool}
     */
    public function patch(): array
    {
        $data = [];
        if ($this->exists('news_and_events')) {
            $data['news_and_events'] = $this->boolean('news_and_events');
        }
        if ($this->exists('memory_status')) {
            $data['memory_status'] = $this->boolean('memory_status');
        }

        return $data;
    }
}
