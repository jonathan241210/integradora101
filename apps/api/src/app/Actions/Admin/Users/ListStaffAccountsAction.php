<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListStaffAccountsAction
{
    public function __construct(private ResolveManageableRolesAction $roles) {}

    public function execute(User $actor, array $filters): LengthAwarePaginator
    {
        $roles = $this->roles->execute($actor);

        if (! empty($filters['role'])) {
            $roles = array_values(array_intersect($roles, [$filters['role']]));
        }

        $query = User::query()
            ->manageableWith($roles)
            ->with(['department', 'roles']);

        if (! empty($filters['search'])) {
            $term = '%'.addcslashes(mb_strtolower($filters['search']), '%_\\').'%';
            $query->where(function ($q) use ($term) {
                foreach (['first_name', 'last_name', 'second_last_name', 'email'] as $column) {
                    $q->orWhereRaw("LOWER(users.$column) LIKE ?", [$term]);
                }
            });
        }

        if (! empty($filters['department_id'])) {
            $query->where('department_id', (int) $filters['department_id']);
        }

        if (($filters['status'] ?? null) === 'active') {
            $query->where('is_active', true);
        } elseif (($filters['status'] ?? null) === 'inactive') {
            $query->where('is_active', false);
        }

        return $query
            ->orderBy('last_name')
            ->orderBy('second_last_name')
            ->orderBy('first_name')
            ->orderBy('users.id')
            ->paginate(min((int) ($filters['per_page'] ?? 25), 100) ?: 25);
    }
}
