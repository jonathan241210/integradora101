<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Users\CreateManagedStaffAccountAction;
use App\Actions\Admin\Users\DeleteStaffAccountAction;
use App\Actions\Admin\Users\FindManageableStaffAccountAction;
use App\Actions\Admin\Users\ListStaffAccountsAction;
use App\Actions\Admin\Users\ListStaffOptionsAction;
use App\Actions\Admin\Users\UpdateStaffAccountAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListStaffAccountsRequest;
use App\Http\Requests\Admin\StoreStaffAccountRequest;
use App\Http\Requests\Admin\UpdateStaffAccountRequest;
use App\Http\Resources\Admin\StaffAccountResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class StaffAccountController extends Controller
{
    public function index(ListStaffAccountsRequest $request, ListStaffAccountsAction $action): AnonymousResourceCollection
    {
        return StaffAccountResource::collection($action->execute($request->user(), $request->validated()));
    }

    public function options(Request $request, ListStaffOptionsAction $action): JsonResponse
    {
        return response()->json(['data' => $action->execute($request->user())]);
    }

    public function show(Request $request, string $user, FindManageableStaffAccountAction $find): StaffAccountResource
    {
        return new StaffAccountResource($find->execute($request->user(), $user));
    }

    public function store(StoreStaffAccountRequest $request, CreateManagedStaffAccountAction $action): JsonResponse
    {
        return (new StaffAccountResource($action->execute($request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function update(
        UpdateStaffAccountRequest $request,
        UpdateStaffAccountAction $action,
    ): StaffAccountResource {
        return new StaffAccountResource($action->execute($request->user(), $request->target(), $request->validated()));
    }

    public function destroy(
        Request $request,
        string $user,
        FindManageableStaffAccountAction $find,
        DeleteStaffAccountAction $action,
    ): Response {
        $action->execute($request->user(), $find->execute($request->user(), $user));

        return response()->noContent();
    }
}
