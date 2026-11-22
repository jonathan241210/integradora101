<?php

namespace App\Actions\Admin\Notices;

use App\Models\StaffNotification;
use App\Models\User;

class MarkConsoleAdminNoticeReadAction
{
    /** Marca el aviso propio como leído; uno ajeno o inexistente responde 404 (api-023 CA-26). */
    public function execute(User $actor, int $noticeId): void
    {
        $notice = StaffNotification::query()
            ->where('user_id', $actor->id)
            ->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)
            ->find($noticeId);

        abort_if($notice === null, 404, 'Aviso no encontrado.');

        if ($notice->read_at === null) {
            $notice->forceFill(['read_at' => now()])->save();
        }
    }
}
