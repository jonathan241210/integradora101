<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\ListPublishedSpeciesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListPublishedSpeciesRequest;
use App\Http\Resources\Catalog\PublishedSpeciesResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublishedSpeciesController extends Controller
{
    public function index(ListPublishedSpeciesRequest $request, ListPublishedSpeciesAction $action): AnonymousResourceCollection
    {
        return PublishedSpeciesResource::collection($action->execute(...$request->filters()));
    }
}
