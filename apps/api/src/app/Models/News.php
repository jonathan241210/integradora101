<?php

namespace App\Models;

use App\Support\PublicCalendar;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class News extends Model
{
    use SoftDeletes;

    protected $table = 'news';

    public $timestamps = false;

    protected $fillable = [
        'title',
        'description',
        'content',
        'published_date',
        'start_date',
        'end_date',
        'category',
        'is_active',
        'author_id',
    ];

    protected function casts(): array
    {
        return [
            'published_date' => 'date:Y-m-d',
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Visibilidad pública (api-011 RN-03): activa, publicada y vigente según PublicCalendar.
     */
    public function scopePublicVisible(Builder $query): Builder
    {
        $today = PublicCalendar::today();

        return $query
            ->where('is_active', true)
            ->where('published_date', '<=', $today)
            ->where(function (Builder $inner) use ($today) {
                $inner->whereNull('end_date')->orWhere('end_date', '>=', $today);
            });
    }
}
