<?php

namespace App\Actions\Admin\Enclosures\Qr;

/** Contrato del generador de valores de código QR de recintos (api-020 RN-03); permite simular colisiones en tests. */
interface QrCodeValueGenerator
{
    public function generate(): string;
}
