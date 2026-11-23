<?php

namespace App\Actions\Console\AdminAccounts;

/**
 * Auditoría de fallos y bloqueos de la contraseña del titular (api-023). Sin causante de usuario y sin la contraseña.
 */
class LogConsoleSecurityEventAction
{
    public function __construct(private LogConsoleActivityAction $osInfo) {}

    public function execute(string $event, string $description, ?string $targetEmail, ?string $command): void
    {
        activity('admin')
            ->causedByAnonymous()
            ->event($event)
            ->withProperties([
                'origin' => 'consola',
                'os_user' => $this->osInfo->osUser(),
                'hostname' => (string) gethostname(),
                'account_email' => $targetEmail,
                'command' => $command,
            ])
            ->log($description);
    }
}
