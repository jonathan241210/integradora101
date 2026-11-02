<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'timezone' => $this->resource['timezone'],
            'today' => $this->resource['today'],
            'last_7_days' => $this->resource['last_7_days'],
            'series' => $this->resource['series'],
        ];
    }
}
