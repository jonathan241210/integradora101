<?php

namespace App\Actions\Admin\Enclosures\Qr;

/** `ARCA-` + 8 caracteres con `random_int` (CSPRNG) sobre un alfabeto sin 0, O, 1, I ni L (api-020 RN-03). */
class EnclosureQrCodeGenerator implements QrCodeValueGenerator
{
    public const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public const PREFIX = 'ARCA-';

    public const LENGTH = 8;

    public function generate(): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $value = '';

        for ($i = 0; $i < self::LENGTH; $i++) {
            $value .= self::ALPHABET[random_int(0, $max)];
        }

        return self::PREFIX.$value;
    }
}
