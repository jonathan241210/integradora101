<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\ListPublishedMemoriesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListPublicMemoriesRequest;
use App\Http\Resources\Catalog\PublicMemoryResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicMemoryController extends Controller
{
    public function index(ListPublicMemoriesRequest $request, ListPublishedMemoriesAction $action): AnonymousResourceCollection
    {
        $result = $action->execute($request->limit(), $request->page());

        return PublicMemoryResource::collection($result['items'])->additional(['meta' => $result['meta']]);
    }
}
