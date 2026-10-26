<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnclosureQrCode extends Model
{
    protected $table = 'enclosure_qr_codes';

    public $timestamps = false;

    protected $fillable = [
        'enclosure_id',
        'code',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function enclosure(): BelongsTo
    {
        return $this->belongsTo(Enclosure::class);
    }
}
