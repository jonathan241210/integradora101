<?php

namespace App\Console\Commands;

use App\Actions\Demo\SeedCancellationReviewDemoAction;
use Illuminate\Console\Command;

/**
 * Datos de demostración del semáforo de cancelaciones (api-027 RN-16, RN-17, RN-18, CA-29 a CA-32). Delgado: valida
 * la opción y delega en `SeedCancellationReviewDemoAction`. Solo en `arca_pruebas`; nunca en producción.
 */
class DemoCancellationReviewsCommand extends Command
{
    public const DATABASE = SeedCancellationReviewDemoAction::DATABASE;

    public const QR_PREFIX = SeedCancellationReviewDemoAction::QR_PREFIX;

    protected $signature = 'arca:demo:cancellation-reviews {--days=14 : Días de negocio recientes (hasta hoy) que se generan, de 1 a 90}';

    protected $description = 'Crea cajeros, boletos y cancelaciones de demostración para el semáforo de cancelaciones (solo arca_pruebas)';

    public function handle(SeedCancellationReviewDemoAction $seed): int
    {
        $refusal = $seed->refusal();

        if ($refusal !== null) {
            $this->error($refusal);

            return self::FAILURE;
        }

        $days = $this->option('days');
        if (! ctype_digit((string) $days) || (int) $days < 1 || (int) $days > 90) {
            $this->error('La opción --days debe ser un entero de 1 a 90.');

            return self::FAILURE;
        }

        try {
            $created = $seed->execute((int) $days);
        } catch (\DomainException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Listo: {$created} boletos de demostración nuevos en {$days} días (los existentes no se tocaron).");

        return self::SUCCESS;
    }
}
