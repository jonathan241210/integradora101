<?php

namespace App\Actions\Console\AdminAccounts;

use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Aplica un cambio de cuenta hecho desde la consola (api-023 RN-07 a RN-10). En una transacción: el cambio,
 * la auditoría y los avisos. Si el cambio lanza una excepción no queda auditoría ni aviso (CA-17, CA-20).
 */
class ApplyConsoleAdminChangeAction
{
    public function __construct(
        private LogConsoleActivityAction $log,
        private CreateConsoleAdminNoticesAction $notices,
    ) {}

    /**
     * @param  Closure(): User  $change  Aplica el cambio y devuelve la cuenta afectada.
     */
    public function execute(string $event, string $label, string $reason, Closure $change, ?string $mode = null): User
    {
        return DB::transaction(function () use ($event, $label, $reason, $change, $mode): User {
            $subject = $change();

            $this->log->execute($event, $label, $subject, $reason, $mode);
            $this->notices->execute($label, $subject->email, $reason);

            return $subject;
        });
    }
}
