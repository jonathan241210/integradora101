<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VisitorTokenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'token_type' => 'Bearer',
            'expires_in' => 900,
            'access_token' => $this->resource['access_token'],
            'refresh_token' => $this->resource['refresh_token'],
            'visitor' => VisitorProfileResource::make($this->resource['visitor'])->resolve($request),
        ];
    }
}
