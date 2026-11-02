<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Content\DeleteEventAction;
use App\Actions\Admin\Content\ListEventsAdminAction;
use App\Actions\Admin\Content\SaveEventAction;
use App\Actions\Admin\Content\SetEventStatusAction;
use App\Actions\Admin\FindAdminResourceAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveEventRequest;
use App\Http\Requests\Admin\SetStatusRequest;
use App\Http\Resources\Admin\EventAdminResource;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class EventController extends Controller
{
    private const NOT_FOUND = 'Evento no encontrado.';

    public function index(ListEventsAdminAction $action): AnonymousResourceCollection
    {
        return EventAdminResource::collection($action->execute());
    }

    public function store(SaveEventRequest $request, SaveEventAction $action): JsonResponse
    {
        return (new EventAdminResource($action->execute($request->user(), null, $request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function update(SaveEventRequest $request, string $event, FindAdminResourceAction $find, SaveEventAction $action): EventAdminResource
    {
        $model = $find->execute(Event::class, $event, self::NOT_FOUND);

        return new EventAdminResource($action->execute($request->user(), $model, $request->validated()));
    }

    public function status(SetStatusRequest $request, string $event, FindAdminResourceAction $find, SetEventStatusAction $action): EventAdminResource
    {
        $model = $find->execute(Event::class, $event, self::NOT_FOUND);

        return new EventAdminResource($action->execute($model, $request->boolean('is_active')));
    }

    public function destroy(string $event, FindAdminResourceAction $find, DeleteEventAction $action): Response
    {
        $action->execute($find->execute(Event::class, $event, self::NOT_FOUND));

        return response()->noContent();
    }
}
