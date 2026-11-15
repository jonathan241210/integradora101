<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\SpeciesPublication\AcceptSpeciesPublicationRequestAction;
use App\Actions\Admin\SpeciesPublication\ListSpeciesPublicationRequestsAction;
use App\Actions\Admin\SpeciesPublication\RejectSpeciesPublicationRequestAction;
use App\Actions\Admin\SpeciesPublication\ShowSpeciesPublicationAction;
use App\Actions\Admin\SpeciesPublication\ShowSpeciesPublicationRequestAction;
use App\Actions\Admin\SpeciesPublication\UpdateSpeciesPublicationRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AcceptSpeciesPublicationRequest;
use App\Http\Requests\Admin\ListSpeciesPublicationRequestsRequest;
use App\Http\Requests\Admin\RejectSpeciesPublicationRequest;
use App\Http\Requests\Admin\UpdateSpeciesPublicationRequest;
use App\Http\Resources\Admin\SpeciesPublicationDetailResource;
use App\Http\Resources\Admin\SpeciesPublicationRequestDetailResource;
use App\Http\Resources\Admin\SpeciesPublicationRequestResource;
use Illuminate\Http\JsonResponse;

class SpeciesPublicationRequestController extends Controller
{
    public function index(ListSpeciesPublicationRequestsRequest $request, ListSpeciesPublicationRequestsAction $action): JsonResponse
    {
        $page = $action->execute($request->validated('status'));

        return response()->json([
            'data' => SpeciesPublicationRequestResource::collection($page->getCollection())->resolve($request),
            'meta' => ['has_more' => $page->hasMorePages()],
        ]);
    }

    public function show(int $id, ShowSpeciesPublicationRequestAction $action): JsonResponse
    {
        return $this->detail($id, $action);
    }

    public function update(int $id, UpdateSpeciesPublicationRequest $request, UpdateSpeciesPublicationRequestAction $action, ShowSpeciesPublicationRequestAction $show): JsonResponse
    {
        $action->execute($request->user(), $id, $request->editableData(), $request->publishedFields(), $request->file('image'));

        return $this->detail($id, $show);
    }

    public function reject(int $id, RejectSpeciesPublicationRequest $request, RejectSpeciesPublicationRequestAction $action, ShowSpeciesPublicationRequestAction $show): JsonResponse
    {
        $action->execute($request->user(), $id, trim($request->validated('rejection_reason')));

        return $this->detail($id, $show);
    }

    public function accept(int $id, AcceptSpeciesPublicationRequest $request, AcceptSpeciesPublicationRequestAction $action, ShowSpeciesPublicationAction $show): JsonResponse
    {
        $speciesId = $action->execute($request->user(), $id, $request->publishFlag());

        return response()->json((new SpeciesPublicationDetailResource($show->execute($speciesId)))->resolve($request));
    }

    private function detail(int $id, ShowSpeciesPublicationRequestAction $action): JsonResponse
    {
        return response()->json((new SpeciesPublicationRequestDetailResource($action->execute($id)))->resolve());
    }
}
