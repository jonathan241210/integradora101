<?php

namespace App\Actions\Admin\Enclosures;

use App\Models\Enclosure;
use App\Models\EnclosureQrCode;

/** Resultado de lectura de las Actions de QR de recintos (api-020). */
final class EnclosureQrResult
{
    /**
     * @param  list<int>  $deactivatedIds
     */
    public function __construct(
        public readonly Enclosure $enclosure,
        public readonly ?EnclosureQrCode $qr,
        public readonly bool $created = false,
        public readonly array $deactivatedIds = [],
    ) {}

    public function deactivated(): int
    {
        return count($this->deactivatedIds);
    }
}
