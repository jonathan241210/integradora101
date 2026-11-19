<?php

namespace App\Console\Commands;

use App\Actions\Admin\Enclosures\GenerateEnclosureQrAction;
use App\Actions\Admin\Enclosures\RegenerateEnclosureQrAction;
use App\Models\Enclosure;
use Illuminate\Console\Command;

class GenerateQrCodesCommand extends Command
{
    protected $signature = 'arca:generate-qr-codes {enclosure} {--regenerate : Desactiva los códigos activos y crea uno nuevo}';

    protected $description = 'Imprime el código QR activo de un recinto, creándolo si no existe (api-020 CA-18)';

    public function handle(GenerateEnclosureQrAction $generate, RegenerateEnclosureQrAction $regenerate): int
    {
        $id = (string) $this->argument('enclosure');
        $enclosure = ctype_digit($id) ? Enclosure::query()->find((int) $id) : null;

        if ($enclosure === null) {
            $this->error('El recinto no existe.');

            return self::FAILURE;
        }

        $properties = ['source' => 'console'];
        $result = $this->option('regenerate')
            ? $regenerate->execute($enclosure, $properties)
            : $generate->execute($enclosure, $properties);

        $this->line($result->qr->code);

        return self::SUCCESS;
    }
}
