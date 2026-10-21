<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\ChangeVisitorPasswordAction;
use App\Actions\Visitor\DeleteVisitorAccountAction;
use App\Actions\Visitor\UpdateVisitorProfileAction;
use App\Http\Requests\Visitor\ChangeVisitorPasswordRequest;
use App\Http\Requests\Visitor\DeleteVisitorAccountRequest;
use App\Http\Requests\Visitor\UpdateVisitorProfileRequest;
use App\Http\Resources\VisitorProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class VisitorProfileController extends VisitorController
{
    public function show(Request $request): VisitorProfileResource
    {
        return new VisitorProfileResource($request->user());
    }

    public function update(UpdateVisitorProfileRequest $request, UpdateVisitorProfileAction $action): VisitorProfileResource
    {
        return new VisitorProfileResource($action->execute($request->user(), $request->validated()));
    }

    public function password(ChangeVisitorPasswordRequest $request, ChangeVisitorPasswordAction $action): JsonResponse
    {
        return $this->respond($action->execute($request->user(), $request->validated()));
    }

    public function destroy(DeleteVisitorAccountRequest $request, DeleteVisitorAccountAction $action): JsonResponse|Response
    {
        return $this->respond($action->execute($request->user(), $request->validated('password'), $request));
    }
}
