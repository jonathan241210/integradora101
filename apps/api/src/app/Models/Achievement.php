<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Achievement extends Model
{
    protected $fillable = [
        'code',
        'title',
        'description',
        'icon',
        'points',
        'rule_type',
        'rule_target',
        'rule_param',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'points' => 'integer',
            'rule_target' => 'integer',
        ];
    }
}
