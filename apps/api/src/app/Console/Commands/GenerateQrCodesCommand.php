<?php

namespace App\Console\Commands;

use App\Models\Enclosure;
use App\Models\EnclosureQrCode;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class GenerateQrCodesCommand extends Command
{
    protected $signature = 'arca:generate-qr-codes {enclosure}';

    protected $description = 'Genera un código QR opaco para un recinto';

    public function handle(): int
    {
        $enclosure = Enclosure::query()->find($this->argument('enclosure'));

        if ($enclosure === null) {
            $this->error('El recinto no existe.');

            return self::FAILURE;
        }

        $code = 'ARCA-'.Str::upper(Str::random(8));
        EnclosureQrCode::query()->create([
            'enclosure_id' => $enclosure->id,
            'code' => $code,
            'is_active' => true,
        ]);

        $this->line($code);

        return self::SUCCESS;
    }
}
