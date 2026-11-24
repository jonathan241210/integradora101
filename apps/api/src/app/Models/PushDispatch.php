<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Fila anti-duplicado de un aviso (api-017, DBR-017).
 * No guarda visitor_id ni datos personales. Sin BaseModel ni SoftDeletes.
 */
class PushDispatch extends Model
{
    protected $fillable = [
        'subject_type',
        'subject_id',
        'transition_key',
        'status',
    ];
}
