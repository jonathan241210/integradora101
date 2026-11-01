<?php

namespace App\Models;

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
}
