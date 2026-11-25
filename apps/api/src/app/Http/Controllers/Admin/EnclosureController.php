<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Enclosures\DeleteEnclosureAction;
use App\Actions\Admin\Enclosures\ListEnclosureAnimalsAction;
use App\Actions\Admin\Enclosures\ListEnclosuresAction;
use App\Actions\Admin\Enclosures\SaveEnclosureAction;
use App\Actions\Admin\Enclosures\SetEnclosureStatusAction;
use App\Actions\Admin\FindAdminResourceAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveEnclosureRequest;
use App\Http\Requests\Admin\SetEnclosureStatusRequest;
use App\Http\Resources\Admin\EnclosureAnimalResource;
use App\Http\Resources\Admin\EnclosureResource;
use App\Models\Enclosure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnclosureController extends Controller
{
    public function index(ListEnclosuresAction $action): AnonymousResourceCollection
    {
        return EnclosureResource::collection($action->execute());
    }

    public function animals(
        string $enclosure,
        FindAdminResourceAction $find,
        ListEnclosureAnimalsAction $action,
    ): AnonymousResourceCollection {
        $model = $find->execute(Enclosure::class, $enclosure, 'Recinto no encontrado.');

        return EnclosureAnimalResource::collection($action->execute($model));
    }

    public function store(SaveEnclosureRequest $request, SaveEnclosureAction $action): JsonResponse
    {
        return (new EnclosureResource($action->execute(null, $request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        SaveEnclosureRequest $request,
        string $enclosure,
        FindAdminResourceAction $find,
        SaveEnclosureAction $action,
    ): EnclosureResource {
        $model = $find->execute(Enclosure::class, $enclosure, 'Recinto no encontrado.');

        return new EnclosureResource($action->execute($model, $request->validated()));
    }

    public function status(
        SetEnclosureStatusRequest $request,
        string $enclosure,
        FindAdminResourceAction $find,
        SetEnclosureStatusAction $action,
    ): EnclosureResource {
        $model = $find->execute(Enclosure::class, $enclosure, 'Recinto no encontrado.');

        return new EnclosureResource($action->execute($model, $request->boolean('is_active')));
    }

    public function destroy(
        string $enclosure,
        FindAdminResourceAction $find,
        DeleteEnclosureAction $action,
    ): JsonResponse {
        $model = $find->execute(Enclosure::class, $enclosure, 'Recinto no encontrado.');
        $action->execute($model);

        return response()->json(['message' => 'Recinto eliminado.']);
    }
}
