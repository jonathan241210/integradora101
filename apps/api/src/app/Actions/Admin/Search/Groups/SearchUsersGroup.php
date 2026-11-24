<?php

namespace App\Actions\Admin\Search\Groups;

use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;
use Illuminate\Support\Facades\DB;

class SearchUsersGroup extends SearchGroup
{
    public function section(): string
    {
        return 'users';
    }

    public function label(): string
    {
        return 'Usuarios';
    }

    public function permission(): string
    {
        return 'users.manage';
    }

    /** CA-48: columnas explícitas; nunca contraseña, 2FA ni tokens. */
    protected function candidates(): array
    {
        $rows = DB::table('users')
            ->leftJoin('departments', 'departments.id', '=', 'users.department_id')
            ->whereNull('users.deleted_at')
            ->orderByDesc('users.id')
            ->limit($this->candidateLimit)
            ->get([
                'users.id', 'users.first_name', 'users.last_name', 'users.second_last_name',
                'users.email', 'departments.name as department_name',
            ]);

        $roles = $this->rolesByUser($rows->pluck('id')->all());

        return $rows->map(function (object $row) use ($roles): array {
            $name = implode(' ', array_filter([$row->first_name, $row->last_name, $row->second_last_name], fn ($part) => $part !== null && $part !== ''));
            $fields = [[null, $name], ['Correo', $row->email], ['Área', $row->department_name]];
            foreach ($roles[$row->id] ?? [] as $role) {
                // Etiqueta en español y también el identificador interno (D-28).
                $fields[] = ['Rol', StaffRoleCatalog::roleLabel($role)];
                if (isset(StaffRoleCatalog::ROLE_LABELS[$role])) {
                    $fields[] = ['Rol', $role];
                }
            }

            return [
                'id' => (int) $row->id,
                'title' => $name,
                'subtitle' => (string) $row->email,
                'fields' => $fields,
                // api-023 CA-35: las cuentas admin se muestran en solo lectura, sin acciones de gestión.
                'managed_by_console' => StaffRoleCatalog::isConsoleManaged($roles[$row->id] ?? []),
            ];
        })->all();
    }

    /**
     * @param  list<int|string>  $ids
     * @return array<int, list<string>>
     */
    private function rolesByUser(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $roles = [];
        foreach (array_chunk($ids, 500) as $chunk) {
            $rows = DB::table('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->where('model_has_roles.model_type', (new User)->getMorphClass())
                ->whereIn('model_has_roles.model_id', $chunk)
                ->get(['model_has_roles.model_id', 'roles.name']);
            foreach ($rows as $row) {
                $roles[(int) $row->model_id][] = (string) $row->name;
            }
        }

        return $roles;
    }
}
