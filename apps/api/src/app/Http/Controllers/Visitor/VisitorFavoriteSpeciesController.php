<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\ListVisitorFavoriteSpeciesAction;
use App\Actions\Visitor\UpdateVisitorFavoriteSpeciesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Visitor\UpdateVisitorFavoriteSpeciesRequest;
use App\Http\Resources\Visitor\VisitorFavoriteSpeciesResource;
use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VisitorFavoriteSpeciesController extends Controller
{
    public function index(Request $request, ListVisitorFavoriteSpeciesAction $action): AnonymousResourceCollection
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return VisitorFavoriteSpeciesResource::collection($action->execute($visitor));
    }

    public function update(
        UpdateVisitorFavoriteSpeciesRequest $request,
        int $species,
        UpdateVisitorFavoriteSpeciesAction $action,
    ): AnonymousResourceCollection {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return VisitorFavoriteSpeciesResource::collection(
            $action->execute($visitor, $species, $request->favorite())
        );
    }
}
