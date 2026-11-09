<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\GetEnclosureAction;
use App\Actions\Catalog\ListEnclosuresAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\EnclosureResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnclosureController extends Controller
{
    public function index(ListEnclosuresAction $action): AnonymousResourceCollection
    {
        return EnclosureResource::collection($action->execute());
    }

    public function show(string $enclosure, GetEnclosureAction $action): EnclosureResource
    {
        abort_unless(ctype_digit($enclosure), 404, 'Recinto no encontrado.');

        $model = $action->execute((int) $enclosure);

        abort_if($model === null, 404, 'Recinto no encontrado.');

        return new EnclosureResource($model);
    }
}
