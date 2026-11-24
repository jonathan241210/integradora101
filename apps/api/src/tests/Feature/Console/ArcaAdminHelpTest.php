<?php

namespace Tests\Feature\Console;

use App\Console\Commands\Admin\HelpAdminsCommand;
use Illuminate\Support\Facades\Artisan;

class ArcaAdminHelpTest extends ConsoleAdminTestCase
{
    /** CA-54 api-023 (revisión 2026-11-21 b): la ayuda se genera de los comandos registrados. */
    public function test_ca54_help_lists_every_registered_command_with_level_and_options(): void
    {
        $before = $this->snapshot();
        $this->assertSame(0, Artisan::call('arca:admin:help'));

        $expected = collect(Artisan::all())->filter(fn ($command, $name) => str_starts_with($name, 'arca:admin:'));
        $output = Artisan::output();
        $this->assertNotEmpty($expected);

        // Formato tipo `git help` (2026-11-21): «uso: php artisan arca:admin:<comando>» y cada comando por su nombre corto.
        $this->assertStringContainsString('uso: php artisan arca:admin:<comando>', $output);

        foreach ($expected as $name => $command) {
            $this->assertMatchesRegularExpression('/^\s+'.preg_quote(substr($name, strlen('arca:admin:')), '/').'\b/m', $output);
            $this->assertStringContainsString($command->getDescription(), $output);
        }

        foreach (['--reason', '--yes', '--confirm-email', '--new-email', '--role', '--first-name', '--deleted', '--all'] as $option) {
            $this->assertStringContainsString($option, $output);
        }

        // Solo comandos y niveles: variables y procedimiento quedan en docs/administracion.md.
        foreach (['lectura', 'bajo', 'medio', 'alto', '-r, --reason', '-y, --yes'] as $text) {
            $this->assertStringContainsString($text, $output);
        }
        $this->assertStringNotContainsString('ARCA_PRIMARY_ADMIN_EMAIL', $output);
        $this->assertSame($before, $this->snapshot());
    }

    /** CA-55 api-023 (revisión 2026-11-21 b): todo `arca:admin:*` declara un nivel válido; falla si falta. */
    public function test_ca55_every_admin_command_declares_a_level(): void
    {
        foreach (Artisan::all() as $name => $command) {
            if (! str_starts_with($name, 'arca:admin:')) {
                continue;
            }

            $constant = $command::class.'::LEVEL';
            $this->assertTrue(defined($constant), "El comando {$name} no declara LEVEL.");
            $this->assertArrayHasKey(constant($constant), HelpAdminsCommand::LEVELS, "Nivel inválido en {$name}.");
        }
    }

    /** CA-55 api-023: descripciones y textos de opciones en español (revisión 2026-11-21 b). */
    public function test_ca55_descriptions_and_options_are_documented_in_spanish(): void
    {
        foreach (Artisan::all() as $name => $command) {
            if (! str_starts_with($name, 'arca:admin:')) {
                continue;
            }

            $this->assertNotSame('', $command->getDescription(), $name);
            $this->assertDoesNotMatchRegularExpression('/\b(the|of|and|account)\b/i', $command->getDescription(), $name);
            foreach ($command->getDefinition()->getOptions() as $option) {
                $this->assertNotSame('', $option->getDescription(), "{$name} --{$option->getName()}");
            }
        }
    }
}
