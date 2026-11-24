<?php

namespace Tests\Feature\Hardening;

use Tests\TestCase;

/** api-028 · scripts destructivos de docs/database/backups (CA-13). */
class MaintenanceScriptsGuardTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = dirname(base_path(), 3).'/docs/database/backups';
    }

    /** CA-13 pre-delivery-hardening */
    public function test_ca13_scripts_abort_for_arca_zoo_or_production_before_connecting(): void
    {
        $sql = tempnam(sys_get_temp_dir(), 'arca').'.sql';
        file_put_contents($sql, 'SELECT 1;');

        foreach ([
            ['reset-and-init.php', []],
            ['restore.php', [$sql]],
        ] as [$script, $args]) {
            foreach ([['DB_DATABASE' => 'arca_zoo', 'APP_ENV' => 'local'], ['DB_DATABASE' => 'arca_pruebas', 'APP_ENV' => 'production']] as $env) {
                [$code, $out, $err] = $this->runScript($script, $args, $env, '');
                $this->assertNotSame(0, $code, "{$script} debe terminar con error.");
                $this->assertStringNotContainsString('Conectando', $out);
                $this->assertStringNotContainsString('Conexión', $out);
                $this->assertStringContainsString('Bloqueado', $err);
            }
        }
        @unlink($sql);
    }

    /** CA-13 pre-delivery-hardening */
    public function test_ca13_other_databases_require_typing_the_database_name(): void
    {
        require_once $this->dir.'/guard.php';

        $this->assertNull(arcaBlockedReason(['DB_DATABASE' => 'arca_pruebas', 'APP_ENV' => 'local']));
        $this->assertNotNull(arcaBlockedReason(['DB_DATABASE' => 'arca_zoo']));
        $this->assertNotNull(arcaBlockedReason(['DB_DATABASE' => 'arca_pruebas', 'APP_ENV' => 'Production']));

        $sql = tempnam(sys_get_temp_dir(), 'arca').'.sql';
        file_put_contents($sql, 'SELECT 1;');
        // Confirmación incorrecta: termina con error y no llega a conectar.
        [$code, $out, $err] = $this->runScript('restore.php', [$sql], ['DB_DATABASE' => 'arca_pruebas', 'APP_ENV' => 'local'], "otra_base\n");
        @unlink($sql);

        $this->assertNotSame(0, $code);
        $this->assertStringContainsString('Escribe el nombre de la base', $out);
        $this->assertStringContainsString('Confirmación incorrecta', $err);
        $this->assertStringNotContainsString('Conectando', $out);
    }

    /**
     * @param  list<string>  $args
     * @param  array<string,string>  $env
     * @return array{0:int,1:string,2:string}
     */
    private function runScript(string $script, array $args, array $env, string $stdin): array
    {
        if (! file_exists(base_path('.env'))) {
            $this->markTestSkipped('Los scripts exigen apps/api/src/.env.');
        }

        $cmd = array_merge([PHP_BINARY, $this->dir.'/'.$script], $args);
        $proc = proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, array_merge(getenv(), $env));
        fwrite($pipes[0], $stdin);
        fclose($pipes[0]);
        $out = stream_get_contents($pipes[1]);
        $err = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        return [proc_close($proc), (string) $out, (string) $err];
    }
}
