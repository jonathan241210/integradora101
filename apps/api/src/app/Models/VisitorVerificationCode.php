<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorVerificationCode extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'visitor_id',
        'purpose',
        'code_hash',
        'expires_at',
        'attempts',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }
}
