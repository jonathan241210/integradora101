<?php

namespace Tests\Unit\Enclosures;

use App\Actions\Admin\Enclosures\Qr\EnclosureQrCodeGenerator;
use PHPUnit\Framework\TestCase;

class EnclosureQrCodeGeneratorTest extends TestCase
{
    /** CA-08 enclosure-qr-management */
    public function test_ca08_formato_sin_caracteres_ambiguos(): void
    {
        $generator = new EnclosureQrCodeGenerator;
        $codes = [];

        for ($i = 0; $i < 1000; $i++) {
            $code = $generator->generate();
            $this->assertMatchesRegularExpression('/^ARCA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/', $code);
            $this->assertLessThanOrEqual(100, strlen($code));
            $this->assertDoesNotMatchRegularExpression('/[01OIL]/', substr($code, 5));
            $codes[$code] = true;
        }

        $this->assertGreaterThan(990, count($codes));
    }
}
