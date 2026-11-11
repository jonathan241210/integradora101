<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;

class PublicNewsDetailResource extends PublicNewsResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'content' => $this->content,
        ]);
    }
}
