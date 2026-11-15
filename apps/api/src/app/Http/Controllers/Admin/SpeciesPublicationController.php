<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\SpeciesPublication\DeleteSpeciesPublicationAction;
use App\Actions\Admin\SpeciesPublication\RepublishSpeciesAction;
use App\Actions\Admin\SpeciesPublication\ShowSpeciesPublicationAction;
use App\Actions\Admin\SpeciesPublication\UnpublishSpeciesAction;
use App\Actions\Admin\SpeciesPublication\UpdateUnpublishedSpeciesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSpeciesPublicationDetailRequest;
use App\Http\Resources\Admin\SpeciesPublicationDetailResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpeciesPublicationController extends Controller
{
    public function show(int $id, ShowSpeciesPublicationAction $show): JsonResponse
    {
        return $this->detail($id, $show);
    }

    public function update(int $id, UpdateSpeciesPublicationDetailRequest $request, UpdateUnpublishedSpeciesAction $action, ShowSpeciesPublicationAction $show): JsonResponse
    {
        $action->execute($request->user(), $id, $request->editableData(), $request->publishedFields(), $request->file('image'));

        return $this->detail($id, $show);
    }

    public function unpublish(int $id, Request $request, UnpublishSpeciesAction $action, ShowSpeciesPublicationAction $show): JsonResponse
    {
        $action->execute($request->user(), $id);

        return $this->detail($id, $show);
    }

    public function republish(int $id, Request $request, RepublishSpeciesAction $action, ShowSpeciesPublicationAction $show): JsonResponse
    {
        $action->execute($request->user(), $id);

        return $this->detail($id, $show);
    }

    public function destroy(int $id, Request $request, DeleteSpeciesPublicationAction $action, ShowSpeciesPublicationAction $show): JsonResponse
    {
        $action->execute($request->user(), $id);

        return $this->detail($id, $show);
    }

    private function detail(int $id, ShowSpeciesPublicationAction $show): JsonResponse
    {
        return response()->json((new SpeciesPublicationDetailResource($show->execute($id)))->resolve());
    }
}
