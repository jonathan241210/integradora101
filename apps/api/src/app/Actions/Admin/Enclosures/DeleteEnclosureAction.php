<?php

namespace App\Actions\Admin\Enclosures;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Support\Facades\DB;

class DeleteEnclosureAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    /**
     * Borrado lógico (RN-02); los animales conservan su recinto (RN-03). Los códigos QR del recinto
     * reciben `deleted_at` en la misma transacción, con el recinto bloqueado (api-020 RN-05, RN-16).
     */
    public function execute(Enclosure $enclosure): void
    {
        DB::transaction(function () use ($enclosure): void {
            Enclosure::query()->whereKey($enclosure->id)->lockForUpdate()->first();

            EnclosureQrCode::query()->where('enclosure_id', $enclosure->id)->delete();
            $enclosure->delete();

            $this->log->execute('deleted', 'Recinto eliminado', $enclosure);
        });
    }
}
