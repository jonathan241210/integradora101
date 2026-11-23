<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\SpeciesPublication\ListPublishedSpeciesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListPublishedSpeciesRequest;
use App\Http\Resources\Admin\PublishedSpeciesResource;
use App\Support\PaginationMeta;
use Illuminate\Http\JsonResponse;

class PublishedSpeciesController extends Controller
{
    public function index(ListPublishedSpeciesRequest $request, ListPublishedSpeciesAction $action): JsonResponse
    {
        $page = $action->execute($request->validated('status'), $request->validated('category'));

        return response()->json([
            'data' => PublishedSpeciesResource::collection($page->getCollection())->resolve($request),
            'meta' => PaginationMeta::from($page),
        ]);
    }
}
