<?php

namespace App\Console\Commands\Admin;

use App\Actions\Console\AdminAccounts\ApplyConsoleAdminChangeAction;
use App\Actions\Console\AdminAccounts\ResolvePrimaryAdminAction;
use App\Actions\Console\AdminAccounts\VerifyPrimaryAdminPasswordAction;
use App\Console\Commands\Concerns\ConfirmsConsoleChange;
use App\Models\User;
use Closure;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

use function Laravel\Prompts\password as promptPassword;

/**
 * Base de los comandos `arca:admin:*` que cambian datos (api-023). Delgada: pide datos y delega en Actions.
 */
abstract class ConsoleAdminCommand extends Command
{
    use ConfirmsConsoleChange;

    public const RECOVERY_NOTICE = 'Modo recuperación activo: desactívalo al terminar (ARCA_ADMIN_RECOVERY=false).';

    public const MODE_PRIMARY = 'primary';

    public const MODE_RECOVERY = 'recovery';

    /** Todo comando `arca:admin:*` avisa cuando el modo recuperación está activo. */
    protected function initialize(InputInterface $input, OutputInterface $output): void
    {
        parent::initialize($input, $output);

        if (config('arca.admin_recovery')) {
            $this->warn(self::RECOVERY_NOTICE);
        }
    }

    /** Rechaza operar sobre el admin titular (desactivar, eliminar, `demote`). */
    protected function rejectPrimaryTarget(User $user): bool
    {
        if (app(ResolvePrimaryAdminAction::class)->isPrimaryEmail($user->email)) {
            $this->error(ResolvePrimaryAdminAction::PROTECTED_MESSAGE);

            return true;
        }

        return false;
    }

    /** Recuperación: solo `reset-password` sobre el titular, con el modo activo. */
    protected function recoveryAppliesTo(User $target): bool
    {
        return (bool) config('arca.admin_recovery')
            && app(ResolvePrimaryAdminAction::class)->isPrimaryEmail($target->email);
    }

    /**
     * Autorización de nivel alto (api-023 revisión 2026-11-21). Con `$recovery` verdadero (modo activo y operación
     * elegible) no pide contraseña: la confirmación posterior es escribir el correo. Si no, pide la contraseña del
     * titular, oculta y solo con terminal. Devuelve `primary`, `recovery` o `null` tras mostrar el error.
     */
    protected function authorizeHighLevel(string $command, ?string $targetEmail, bool $recovery = false): ?string
    {
        if ($recovery) {
            return self::MODE_RECOVERY;
        }

        [$primary, $error] = app(ResolvePrimaryAdminAction::class)->resolve();

        if ($primary === null) {
            $this->error($error);

            return null;
        }

        $verify = app(VerifyPrimaryAdminPasswordAction::class);

        if ($verify->isLocked()) {
            $this->error('Los comandos de nivel alto están bloqueados por intentos fallidos. Intenta de nuevo en 10 minutos.');

            return null;
        }

        if ($this->rejectWithoutTerminal()) {
            return null;
        }

        $password = promptPassword(label: 'Contraseña del administrador titular', required: true);

        if (! $verify->verify($primary, $password, $targetEmail, $command)) {
            $this->error($verify->isLocked()
                ? 'Contraseña incorrecta. Los comandos de nivel alto quedan bloqueados 10 minutos.'
                : 'Contraseña del administrador titular incorrecta.');

            return null;
        }

        return self::MODE_PRIMARY;
    }

    /** Cuenta por correo (incluye eliminadas para dar el mensaje correcto); `null` tras mostrar el error. */
    protected function findAccount(string $email): ?User
    {
        $user = User::withTrashed()->with('roles')->where('email', mb_strtolower(trim($email)))->first();

        if ($user === null) {
            $this->error('No existe una cuenta con ese correo.');
        }

        return $user;
    }

    /** Solo cuentas admin (RN-18, CA-30). */
    protected function findAdminAccount(string $email): ?User
    {
        $user = $this->findAccount($email);

        if ($user === null) {
            return null;
        }

        if (! $user->hasRole('admin')) {
            $this->error('La cuenta no es de administrador: este comando solo actúa sobre cuentas de administrador.');

            return null;
        }

        if ($user->trashed()) {
            $this->error('La cuenta está eliminada.');

            return null;
        }

        return $user;
    }

    /**
     * Aplica el cambio con auditoría y avisos; devuelve el código de salida. Las validaciones del cambio
     * (p. ej. continuidad de administradores) se muestran como error sin dejar rastro.
     *
     * @param  Closure(): User  $change
     */
    protected function applyChange(string $event, string $label, string $reason, Closure $change, string $done, ?string $mode = null): int
    {
        try {
            $subject = app(ApplyConsoleAdminChangeAction::class)->execute($event, $label, $reason, $change, $mode);
        } catch (ValidationException $e) {
            $this->error($e->validator->errors()->first());

            return self::FAILURE;
        }

        $this->info(sprintf($done, $subject->email));

        return self::SUCCESS;
    }
}
