<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\ListPathNodesAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\PathNodeResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PathNodeController extends Controller
{
    public function index(ListPathNodesAction $action): AnonymousResourceCollection
    {
        return PathNodeResource::collection($action->execute());
    }
}