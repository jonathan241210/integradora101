<?php

namespace App\Http\Requests\Visitor;

use Illuminate\Http\UploadedFile;

/** Envío de un momento (api-010 CA-02 a CA-04; campos image, opinion y consent, D-M9). */
class StoreVisitorMemoryRequest extends VisitorFormRequest
{
    protected const IMAGE_MESSAGE = 'La foto debe ser JPG, PNG o WebP de máximo 5 MB.';

    protected const OPINION_MESSAGE = 'La opinión puede tener hasta 300 caracteres.';

    protected const CONSENT_MESSAGE = 'Confirma que tienes permiso para compartir esta foto y que aceptas los términos.';

    protected function prepareForValidation(): void
    {
        parent::prepareForValidation();

        if ($this->has('opinion') && is_string($this->input('opinion'))) {
            $this->merge(['opinion' => trim($this->input('opinion')) ?: null]);
        }
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'opinion' => ['nullable', 'string', 'max:300'],
            'consent' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => self::IMAGE_MESSAGE,
            'image.file' => self::IMAGE_MESSAGE,
            'image.uploaded' => self::IMAGE_MESSAGE,
            'image.image' => self::IMAGE_MESSAGE,
            'image.mimes' => self::IMAGE_MESSAGE,
            'image.max' => self::IMAGE_MESSAGE,
            'opinion.string' => self::OPINION_MESSAGE,
            'opinion.max' => self::OPINION_MESSAGE,
            'consent.required' => self::CONSENT_MESSAGE,
            'consent.accepted' => self::CONSENT_MESSAGE,
        ];
    }

    public function photo(): ?UploadedFile
    {
        return $this->file('image');
    }

    /** Opinión recortada; NULL si no se envía o queda vacía (RN-06). */
    public function opinion(): ?string
    {
        $value = $this->validated('opinion');

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
