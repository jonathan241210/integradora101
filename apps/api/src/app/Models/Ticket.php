<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Registro financiero de solo lectura para esta feature (api-007).
 */
class Ticket extends Model
{
    protected $table = 'tickets';

    public $timestamps = false;

    protected $hidden = ['qr_code'];

    protected static function booted(): void
    {
        $block = static function (): never {
            throw new \LogicException('Los boletos son de solo lectura en esta funcionalidad.');
        };

        static::saving($block);
        static::deleting($block);
    }

    protected function casts(): array
    {
        return [
            'adult_quantity' => 'integer',
            'child_quantity' => 'integer',
            'purchased_at' => 'datetime',
        ];
    }
}
