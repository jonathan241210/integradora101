<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorRefreshToken extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'visitor_id',
        'family_id',
        'token_hash',
        'device_name',
        'expires_at',
        'revoked_at',
        'replaced_by_id',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }
}
