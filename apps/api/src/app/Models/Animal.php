<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Animal extends Model
{
    protected $table = 'animals';

    public $timestamps = false;

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class);
    }

    public function enclosure(): BelongsTo
    {
        return $this->belongsTo(Enclosure::class);
    }
}
