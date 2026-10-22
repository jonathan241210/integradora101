<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VisitorProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'email' => $this->email,
            'first_name' => $this->first_name,
            'nickname' => $this->nickname,
            'avatar_code' => $this->avatar_code,
        ];
    }
}
