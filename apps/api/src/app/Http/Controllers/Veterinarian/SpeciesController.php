<?php

namespace App\Http\Controllers\Veterinarian;

use App\Actions\Veterinarian\SpeciesPublication\ListSelectableSpeciesAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Veterinarian\SelectableSpeciesResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SpeciesController extends Controller
{
    public function index(Request $request, ListSelectableSpeciesAction $action): AnonymousResourceCollection
    {
        return SelectableSpeciesResource::collection($action->execute($request->user()));
    }
}
