<?php

namespace App\Actions\Admin\Notices;

use App\Models\StaffNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ListConsoleAdminNoticesAction
{
    /**
     * Avisos de consola no leídos del administrador, del más antiguo al más reciente (api-023 CA-25).
     *
     * @return Collection<int, StaffNotification>
     */
    public function execute(User $actor): Collection
    {
        return StaffNotification::query()
            ->where('user_id', $actor->id)
            ->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)
            ->whereNull('read_at')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();
    }
}
