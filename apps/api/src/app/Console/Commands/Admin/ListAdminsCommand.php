<?php

namespace App\Console\Commands\Admin;

use App\Models\User;

class ListAdminsCommand extends ConsoleAdminCommand
{
    public const LEVEL = 'lectura';

    protected $signature = 'arca:admin:list {--d|deleted : Muestra solo las cuentas eliminadas, con su fecha de eliminación} {--a|all : Muestra todas las cuentas (activas, desactivadas y eliminadas) con su estado}';

    protected $description = 'Lista las cuentas de administrador (solo lectura; sin opciones muestra activas y desactivadas)';

    public function handle(): int
    {
        if ($this->option('deleted') && $this->option('all')) {
            $this->error('Las opciones --deleted y --all no se pueden usar juntas.');

            return self::FAILURE;
        }

        $query = User::query()->role('admin')->with('department')->orderBy('email');

        if ($this->option('deleted')) {
            $query->onlyTrashed();
        } elseif ($this->option('all')) {
            $query->withTrashed();
        }

        $admins = $query->get();

        if ($admins->isEmpty()) {
            $this->warn($this->option('deleted') ? 'No hay cuentas eliminadas.' : 'No hay cuentas de administrador.');

            return self::SUCCESS;
        }

        $primary = mb_strtolower(trim((string) config('arca.primary_admin_email')));
        $deleted = (bool) $this->option('deleted');

        $this->table(
            ['Correo', 'Nombre', 'Área', $deleted ? 'Eliminada el' : 'Estado', 'Segundo factor'],
            $admins->map(fn (User $user) => [
                $user->email.($primary !== '' && mb_strtolower($user->email) === $primary ? ' (Titular)' : ''),
                $user->full_name,
                $user->department?->name ?? '—',
                $deleted ? $user->deleted_at->format('Y-m-d H:i') : ($user->trashed() ? 'Eliminada' : ($user->is_active ? 'Activa' : 'Desactivada')),
                $user->two_factor_confirmed_at !== null ? 'Configurado' : 'Pendiente',
            ])->all(),
        );

        return self::SUCCESS;
    }
}
