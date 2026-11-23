<?php

namespace App\Console\Commands\Admin;

use Symfony\Component\Console\Command\Command as SymfonyCommand;

/**
 * Ayuda resumida de `arca:admin:*` (api-023, revisión 2026-11-21 b). Se genera de los comandos registrados:
 * nombre, descripción y opciones salen de su definición; el nivel, de la constante `LEVEL` de cada comando.
 */
class HelpAdminsCommand extends ConsoleAdminCommand
{
    public const LEVEL = 'lectura';

    public const LEVELS = [
        'lectura' => 'solo lectura, no pide nada',
        'bajo' => 'motivo y confirmación',
        'medio' => 'motivo y escribir el correo afectado',
        'alto' => 'motivo y contraseña del titular',
    ];

    protected $signature = 'arca:admin:help';

    protected $description = 'Muestra la ayuda resumida de los comandos arca:admin:*, sus niveles y opciones';

    /** Sangrías al estilo de `git help`; los anchos se calculan con el texto más largo. */
    private const INDENT = '   ';

    private const OPTION_INDENT = '       ';

    public function handle(): int
    {
        $application = $this->getApplication();
        $global = array_keys($application->getDefinition()->getOptions());
        $globalArguments = array_keys($application->getDefinition()->getArguments());
        $byLevel = array_fill_keys(array_keys(self::LEVELS), []);

        foreach ($application->all('arca:admin') as $name => $command) {
            if ($name !== $command->getName()) {
                continue; // alias
            }

            $arguments = collect($command->getDefinition()->getArguments())
                ->reject(fn ($argument, $key) => in_array($key, $globalArguments, true))
                ->map(fn ($argument) => '<'.$argument->getName().'>')
                ->implode(' ');
            $options = collect($command->getDefinition()->getOptions())
                ->reject(fn ($option, $key) => in_array($key, $global, true))
                ->map(fn ($option) => [
                    ($option->getShortcut() ? '-'.$option->getShortcut().', ' : '').'--'.$option->getName()
                        .($option->acceptValue() ? '="…"' : ''),
                    $option->getDescription(),
                ])
                ->values()
                ->all();
            $level = defined($command::class.'::LEVEL') ? constant($command::class.'::LEVEL') : 'lectura';

            $byLevel[$level][] = [
                'usage' => trim(substr($name, strlen('arca:admin:')).' '.$arguments),
                'name' => $name,
                'description' => $command->getDescription(),
                'options' => $options,
            ];
        }

        $all = array_merge(...array_values($byLevel));
        $commandWidth = 2 + max(array_map(fn (array $c) => mb_strlen($c['usage']), $all));
        $flagWidth = 2 + max(array_map(
            fn (array $option) => mb_strlen($option[0]),
            array_merge([['']], ...array_map(fn (array $c) => $c['options'], $all)),
        ));

        $this->line('uso: php artisan arca:admin:<comando> [<email>] [opciones]');

        foreach ($byLevel as $level => $commands) {
            if ($commands === []) {
                continue;
            }

            usort($commands, fn ($a, $b) => strcmp($a['usage'], $b['usage']));
            $this->newLine();
            $this->line(($level === 'lectura' ? 'Consulta' : 'Nivel '.$level).' ('.self::LEVELS[$level].')');

            foreach ($commands as $command) {
                $this->line(self::INDENT.self::pad($command['usage'], $commandWidth).$command['description']);

                foreach ($command['options'] as [$flag, $help]) {
                    $this->line(self::OPTION_INDENT.self::pad($flag, $flagWidth).$help);
                }
            }
        }

        return SymfonyCommand::SUCCESS;
    }

    /** `str_pad` que cuenta caracteres (las descripciones llevan acentos y «…»). */
    private static function pad(string $text, int $width): string
    {
        return $text.str_repeat(' ', max(1, $width - mb_strlen($text)));
    }
}
