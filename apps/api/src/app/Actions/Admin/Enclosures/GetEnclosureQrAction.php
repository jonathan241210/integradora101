<?php

namespace App\Actions\Admin\Enclosures;

use App\Models\Enclosure;
use App\Models\EnclosureQrCode;

/** Solo lectura (api-020 RN-13): código activo de `id` mayor (RN-01) o null. */
class GetEnclosureQrAction
{
    public function execute(Enclosure $enclosure): EnclosureQrResult
    {
        return new EnclosureQrResult($enclosure, $this->visible($enclosure));
    }

    public function visible(Enclosure $enclosure): ?EnclosureQrCode
    {
        return EnclosureQrCode::query()
            ->where('enclosure_id', $enclosure->id)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->first();
    }
}
