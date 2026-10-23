<?php

namespace App\Http\Controllers\Staff;

use App\Actions\Staff\CreateStaffAccountAction;
use App\Actions\Staff\DeactivateStaffAccountAction;
use App\Actions\Staff\LogStaffUserEventAction;
use App\Actions\Staff\ResolveManageableRolesAction;
use App\Actions\Staff\SuggestRoleForDepartmentAction;
use App\Actions\Staff\UpdateStaffAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\StaffUserResource;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Role;

class StaffUserController extends Controller
{
    public function __construct(
        private readonly CreateStaffAccountAction $createAccount,
        private readonly UpdateStaffAccountAction $updateAccount,
        private readonly DeactivateStaffAccountAction $deactivateAccount,
        private readonly ResolveManageableRolesAction $manageableRoles,
        private readonly SuggestRoleForDepartmentAction $suggestRole,
        private readonly LogStaffUserEventAction $logEvent,
    ) {}

    public function index(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        $actor = $request->user();
        $query = User::query()
            ->with(['department', 'roles'])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->orderBy('id');

        if (! $actor->can('users.manage')) {
            $roles = $this->manageableRoles->execute($actor);
            $query
                ->whereHas('roles', fn ($rolesQuery) => $rolesQuery
                    ->where('roles.guard_name', 'web')
                    ->whereIn('roles.name', $roles))
                ->whereDoesntHave('roles', fn ($rolesQuery) => $rolesQuery
                    ->where('roles.guard_name', 'web')
                    ->whereNotIn('roles.name', $roles));
        }

        return StaffUserResource::collection($query->get());
    }

    public function catalog(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        $labels = [
            'admin' => 'Administrador General (Presidencia)',
            'zoo-admin' => 'Administrador del Zoológico',
            'executive' => 'Altos Directivos',
            'cashier' => 'Cajero',
            'veterinarian' => 'Médico Veterinario',
        ];
        $roles = collect($this->manageableRoles->execute($request->user()))
            ->map(fn (string $name) => ['name' => $name, 'label' => $labels[$name] ?? $name])
            ->values();
        $departments = Department::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (Department $department) => [
                'id' => $department->id,
                'code' => $department->code,
                'name' => $department->name,
                'suggested_role' => $this->suggestRole->execute($department),
            ])
            ->values();

        return response()->json([
            'data' => [
                'departments' => $departments,
                'roles' => $roles,
            ],
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('create', User::class);

        $data = $request->only([
            'email',
            'first_name',
            'last_name',
            'second_last_name',
            'department_id',
            'role',
            'password',
        ]);
        $role = $data['role'] ?? null;
        if (is_string($role) && Role::query()->where('name', $role)->where('guard_name', 'web')->exists()) {
            Gate::authorize('assignRole', [User::class, $role]);
        }

        $staffUser = $this->createAccount->execute($data);
        $this->logEvent->execute('created', $staffUser, [
            'email',
            'first_name',
            'last_name',
            'second_last_name',
            'department_id',
            'role',
        ]);

        return (new StaffUserResource($staffUser->load(['department', 'roles'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, User $staffUser)
    {
        Gate::authorize('update', $staffUser);

        $data = $request->all();
        $role = $data['role'] ?? null;
        if (is_string($role) && Role::query()->where('name', $role)->where('guard_name', 'web')->exists()) {
            $currentRoles = $staffUser->getRoleNames()->values()->all();
            $sameSelfRole = $request->user()->is($staffUser) && $currentRoles === [$role];
            if (! $sameSelfRole) {
                Gate::authorize('assignRole', [$staffUser, $role]);
            }
        }

        $result = $this->updateAccount->execute($staffUser, $data);
        $this->logEvent->execute('updated', $result['user'], $result['changed_fields']);

        return new StaffUserResource($result['user']);
    }

    public function destroy(User $staffUser)
    {
        Gate::authorize('delete', $staffUser);
        $this->deactivateAccount->execute($staffUser);
        $this->logEvent->execute('deactivated', $staffUser, ['is_active', 'deleted_at']);

        return response()->noContent();
    }
}
