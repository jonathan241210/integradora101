<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrivacyNoticeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'version' => $this->resource['version'],
            'content' => $this->resource['content'],
        ];
    }
}
