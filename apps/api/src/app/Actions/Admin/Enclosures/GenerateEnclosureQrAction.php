<?php

namespace App\Actions\Admin\Enclosures;

use App\Actions\Admin\Enclosures\Qr\QrCodeValueGenerator;
use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class GenerateEnclosureQrAction
{
    public const MAX_ATTEMPTS = 5;

    public const FAILURE_MESSAGE = 'No pudimos generar el código QR. Inténtalo de nuevo.';

    public function __construct(
        private QrCodeValueGenerator $generator,
        private GetEnclosureQrAction $get,
        private LogAdminActivityAction $log,
    ) {}

    /** Reutiliza el activo si existe (CA-04); si no, crea uno con reintento ante colisión (CA-09). */
    public function execute(Enclosure $enclosure, array $properties = []): EnclosureQrResult
    {
        return DB::transaction(function () use ($enclosure, $properties): EnclosureQrResult {
            Enclosure::query()->whereKey($enclosure->id)->lockForUpdate()->first();

            $existing = $this->get->visible($enclosure);

            if ($existing !== null) {
                return new EnclosureQrResult($enclosure, $existing);
            }

            $qr = self::createUnique($this->generator, $enclosure);

            $this->log->execute('qr_generated', 'Código QR generado', $enclosure, $properties + ['qr_code_id' => $qr->id]);

            return new EnclosureQrResult($enclosure, $qr, created: true);
        });
    }

    /** Hasta 5 intentos; el valor nunca aparece en el mensaje de error (RN-10). */
    public static function createUnique(QrCodeValueGenerator $generator, Enclosure $enclosure): EnclosureQrCode
    {
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $value = $generator->generate();

            if (EnclosureQrCode::withTrashed()->where('code', $value)->exists()) {
                continue;
            }

            try {
                // Savepoint: una colisión UNIQUE no debe invalidar la transacción externa.
                return DB::transaction(fn () => EnclosureQrCode::query()->create([
                    'enclosure_id' => $enclosure->id,
                    'code' => $value,
                    'is_active' => true,
                ]));
            } catch (QueryException $e) {
                if (! str_contains((string) $e->getCode(), '23000')) {
                    throw $e;
                }
            }
        }

        abort(500, self::FAILURE_MESSAGE);
    }
}
