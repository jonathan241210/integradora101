<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\GetEventAction;
use App\Actions\Catalog\ListEventsAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventController extends Controller
{
    public function index(ListEventsAction $action): AnonymousResourceCollection
    {
        return EventResource::collection($action->execute());
    }

    public function show(string $event, GetEventAction $action): EventResource
    {
        abort_unless(ctype_digit($event), 404, 'Evento no encontrado.');

        $model = $action->execute((int) $event);

        abort_if($model === null, 404, 'Evento no encontrado.');

        return new EventResource($model);
    }
}
