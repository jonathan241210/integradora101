<?php

namespace App\Http\Resources\Admin\Tickets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CancellationReasonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->resource['code'],
            'label' => $this->resource['label'],
            'comment_policy' => $this->resource['comment_policy'],
        ];
    }
}
