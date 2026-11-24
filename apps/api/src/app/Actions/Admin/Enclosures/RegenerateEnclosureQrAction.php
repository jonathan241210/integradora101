<?php

namespace App\Actions\Admin\Enclosures;

use App\Actions\Admin\Enclosures\Qr\QrCodeValueGenerator;
use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Support\Facades\DB;

class RegenerateEnclosureQrAction
{
    public function __construct(
        private QrCodeValueGenerator $generator,
        private LogAdminActivityAction $log,
    ) {}

    /** Desactiva (nunca elimina) los activos y crea uno nuevo (api-020 RN-04). */
    public function execute(Enclosure $enclosure, array $properties = []): EnclosureQrResult
    {
        return DB::transaction(function () use ($enclosure, $properties): EnclosureQrResult {
            Enclosure::query()->whereKey($enclosure->id)->lockForUpdate()->first();

            $ids = EnclosureQrCode::query()
                ->where('enclosure_id', $enclosure->id)
                ->where('is_active', true)
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($ids !== []) {
                EnclosureQrCode::query()->whereIn('id', $ids)->update(['is_active' => false]);
            }

            $qr = GenerateEnclosureQrAction::createUnique($this->generator, $enclosure);

            $this->log->execute('qr_regenerated', 'Código QR regenerado', $enclosure, $properties + [
                'qr_code_id' => $qr->id,
                'deactivated_ids' => $ids,
            ]);

            return new EnclosureQrResult($enclosure, $qr, created: true, deactivatedIds: $ids);
        });
    }
}
