<?php

namespace App\Console\Commands\Concerns;

use App\Actions\Console\AdminAccounts\ValidateConsoleReasonAction;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\text;

/**
 * Pasos comunes de los comandos de consola que cambian datos (api-023 RN-07, RN-08, RN-20): motivo, resumen con la
 * base activa y confirmación. El comando debe declarar `{--reason=}` y `{--yes}`.
 */
trait ConfirmsConsoleChange
{
    /** Motivo válido (RN-07) o `null` tras mostrar el error; en modo interactivo lo pide si no vino en `--reason`. */
    protected function askReason(): ?string
    {
        $reason = $this->option('reason');

        if (($reason === null || $reason === '') && $this->input->isInteractive()) {
            $reason = text('Motivo del cambio (mínimo 10 caracteres)');
        }

        $valid = app(ValidateConsoleReasonAction::class)->execute($reason);

        if ($valid === null) {
            $this->error(ValidateConsoleReasonAction::MESSAGE);
        }

        return $valid;
    }

    /** Verdadero si la última confirmación falló por un correo distinto (el comando termina con error). */
    protected bool $confirmationMismatch = false;

    /** Código de salida tras una confirmación no aceptada: error si el correo no coincidió; éxito si se canceló. */
    protected function declined(): int
    {
        return $this->confirmationMismatch ? self::FAILURE : self::SUCCESS;
    }

    private function confirmTypedEmail(string $email): bool
    {
        $given = $this->hasOption('confirm-email') ? $this->option('confirm-email') : null;

        if (($given === null || $given === '') && $this->input->isInteractive()) {
            $given = text("Para confirmar, escribe el correo afectado ($email)");
        }

        if ($given === null || $given === '') {
            $this->warn('Sin terminal solo se aplica el cambio con --confirm-email=<correo afectado>.');

            return false;
        }

        if (mb_strtolower(trim((string) $given)) !== mb_strtolower($email)) {
            $this->error('El correo escrito no coincide con la cuenta afectada. No se modificó ninguna cuenta.');
            $this->confirmationMismatch = true;

            return false;
        }

        return true;
    }

    /** Los comandos que piden una contraseña no se ejecutan sin terminal (CA-34): nunca se acepta por argumento. */
    protected function rejectWithoutTerminal(): bool
    {
        if ($this->input->isInteractive()) {
            return false;
        }

        $this->error('Este comando pide la contraseña en la terminal.');

        return true;
    }

    /**
     * Muestra el resumen con la base activa y pide la confirmación (RN-08). Sin terminal solo confirma `--yes`.
     * Nunca muestra contraseñas.
     *
     * Nivel medio (api-023, revisión 2026-11-21): con `$requireEmail` la confirmación es escribir ese correo, o pasar
     * `--confirm-email=<correo>` que debe coincidir; `--yes` no la sustituye.
     *
     * @param  array<string, string>  $summary
     */
    protected function confirmChange(array $summary, ?string $requireEmail = null): bool
    {
        $this->confirmationMismatch = false;
        $connection = (string) config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        $rows = ['Conexión' => $connection, 'Base de datos' => $database] + $summary;
        $this->table(['Dato', 'Valor'], array_map(fn ($key, $value) => [$key, $value], array_keys($rows), $rows));

        if ($requireEmail !== null) {
            return $this->confirmTypedEmail($requireEmail);
        }

        if ($this->option('yes')) {
            return true;
        }

        if (! $this->input->isInteractive()) {
            $this->warn('Sin terminal no se aplica ningún cambio sin --yes.');

            return false;
        }

        $confirmed = confirm('¿Aplicar el cambio?', default: false);

        if (! $confirmed) {
            $this->warn('Cambio cancelado. No se modificó ninguna cuenta.');
        }

        return $confirmed;
    }
}
