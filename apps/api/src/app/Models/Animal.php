<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Animal extends Model
{
    protected $table = 'animals';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'birth_date' => 'date:Y-m-d',
        'entry_date' => 'date:Y-m-d',
    ];

    public function species(): BelongsTo
    {
        return $this->belongsTo(Species::class, 'species_id');
    }

    public function enclosure(): BelongsTo
    {
        return $this->belongsTo(Enclosure::class);
    }
}
