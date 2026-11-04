<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\GetSpeciesAction;
use App\Actions\Catalog\ListSpeciesAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\SpeciesResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SpeciesController extends Controller
{
    public function index(ListSpeciesAction $action): AnonymousResourceCollection
    {
        return SpeciesResource::collection($action->execute());
    }

    public function show(string $species, GetSpeciesAction $action): SpeciesResource
    {
        abort_unless(ctype_digit($species), 404, 'Especie no encontrada.');

        $model = $action->execute((int) $species);

        abort_if($model === null, 404, 'Especie no encontrada.');

        return new SpeciesResource($model);
    }
}
