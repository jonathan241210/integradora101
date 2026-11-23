<?php

namespace App\Http\Resources\Admin\Reports;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CancellationReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'period' => $this->resource['period']->toArray(),
            'totals' => $this->resource['totals'],
            'reconciliation' => $this->resource['reconciliation'],
            'rows' => $this->resource['rows'],
            'legend' => $this->resource['legend'],
            'levels' => $this->resource['levels'],
            'disclaimer' => $this->resource['disclaimer'],
        ];
    }

    public function with(Request $request): array
    {
        return ['meta' => $this->resource['meta']];
    }
}
