<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Teléfono Android que recibe avisos (api-017, DBR-017).
 * Excepción RN-12: sin BaseModel ni SoftDeletes. Se borra con la cuenta.
 */
class VisitorPushToken extends Model
{
    protected $fillable = [
        'visitor_id',
        'token',
        'platform',
    ];

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }
}
