<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\ListZooPlacesAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\ZooPlaceResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ZooPlaceController extends Controller
{
    public function index(ListZooPlacesAction $action): AnonymousResourceCollection
    {
        return ZooPlaceResource::collection($action->execute());
    }
}