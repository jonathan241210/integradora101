<?php

namespace Tests\Feature\Timezone;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class BusinessTimezoneConfigTest extends TestCase
{
    /** CA-01 single-business-timezone */
    public function test_ca01_default_value_and_single_key(): void
    {
        $previous = [getenv('ARCA_TIMEZONE'), $_ENV['ARCA_TIMEZONE'] ?? null, $_SERVER['ARCA_TIMEZONE'] ?? null];
        putenv('ARCA_TIMEZONE');
        unset($_ENV['ARCA_TIMEZONE'], $_SERVER['ARCA_TIMEZONE']);
        try {
            $config = require config_path('arca.php');
        } finally {
            if ($previous[0] !== false) {
                putenv('ARCA_TIMEZONE='.$previous[0]);
            }
            if ($previous[1] !== null) {
                $_ENV['ARCA_TIMEZONE'] = $previous[1];
            }
            if ($previous[2] !== null) {
                $_SERVER['ARCA_TIMEZONE'] = $previous[2];
            }
        }

        $this->assertSame('America/Mexico_City', $config['timezone']);
        $this->assertArrayNotHasKey('report_timezone', $config);
        $this->assertArrayNotHasKey('public_timezone', $config);

        foreach (File::allFiles(app_path()) as $file) {
            $source = $file->getContents();
            $this->assertStringNotContainsString('arca.report_timezone', $source, $file->getPathname());
            $this->assertStringNotContainsString('arca.public_timezone', $source, $file->getPathname());
            $this->assertStringNotContainsString('ResolveRequestedTimezoneAction', $source, $file->getPathname());
        }
    }

    /** CA-03 single-business-timezone */
    public function test_ca03_instants_in_utc_and_app_timezone_utc(): void
    {
        $this->assertSame('UTC', config('app.timezone'));
        $this->assertSame('UTC', date_default_timezone_get());
    }

    /** CA-11 single-business-timezone */
    public function test_ca11_sesion_mysql_en_utc(): void
    {
        $this->assertSame('+00:00', config('database.connections.mysql.timezone'));
        $this->assertSame('+00:00', DB::selectOne('select @@session.time_zone as tz')->tz);
    }
}
