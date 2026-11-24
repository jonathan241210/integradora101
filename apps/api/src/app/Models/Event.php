<?php

namespace App\Models;

use App\Support\PublicCalendar;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use SoftDeletes;

    protected $table = 'events';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'location',
        'is_active',
        'author_id',
    ];

    /**
     * Visibilidad pública (api-006): activo y con fin nulo o no anterior a hoy.
     */
    public function scopePublicVisible(Builder $query): Builder
    {
        $today = PublicCalendar::today();

        return $query
            ->where('is_active', true)
            ->where(function (Builder $inner) use ($today) {
                $inner->whereNull('end_date')->orWhere('end_date', '>=', $today);
            });
    }
}
