<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Visitor extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'email',
        'first_name',
        'last_name',
        'second_last_name',
        'nickname',
        'password',
        'avatar_code',
        'is_active',
        'email_verified_at',
        'adult_confirmed_at',
        'privacy_notice_version',
        'privacy_accepted_at',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'email_verified_at' => 'datetime',
            'adult_confirmed_at' => 'datetime',
            'privacy_accepted_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(VisitorRefreshToken::class);
    }

    public function verificationCodes(): HasMany
    {
        return $this->hasMany(VisitorVerificationCode::class);
    }
}
