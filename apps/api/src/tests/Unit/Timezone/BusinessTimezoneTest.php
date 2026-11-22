<?php

namespace Tests\Unit\Timezone;

use App\Providers\AppServiceProvider;
use App\Support\BusinessTimezone;
use Tests\TestCase;

class BusinessTimezoneTest extends TestCase
{
    /** CA-14 single-business-timezone */
    public function test_ca14_boot_fails_with_invalid_arca_timezone(): void
    {
        foreach (['', 'Mars/Olympus', 'EST', '+05:00'] as $value) {
            config(['arca.timezone' => $value]);
            try {
                BusinessTimezone::assertValid();
                $this->fail("Se aceptó la zona '{$value}'.");
            } catch (\RuntimeException $e) {
                $this->assertStringContainsString('ARCA_TIMEZONE no es una zona horaria válida: "'.$value.'"', $e->getMessage());
            }
        }

        // El proveedor de servicios llama assertValid() al arrancar: sin respaldo silencioso.
        config(['arca.timezone' => 'Mars/Olympus']);
        $this->expectException(\RuntimeException::class);
        (new AppServiceProvider($this->app))->boot();
    }

    public function test_accepts_valid_zones_and_computes_business_days(): void
    {
        foreach (['America/Mexico_City', 'UTC'] as $value) {
            config(['arca.timezone' => $value]);
            BusinessTimezone::assertValid();
            $this->assertSame($value, BusinessTimezone::name());
        }

        config(['arca.timezone' => 'America/Mexico_City']);
        $this->assertSame('2026-11-06 06:00:00', BusinessTimezone::startOfDayUtc('2026-11-06')->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-07 06:00:00', BusinessTimezone::endOfDayUtc('2026-11-06')->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-06', BusinessTimezone::dateOf(new \DateTimeImmutable('2026-11-07 05:30:00 UTC')));
    }
}
