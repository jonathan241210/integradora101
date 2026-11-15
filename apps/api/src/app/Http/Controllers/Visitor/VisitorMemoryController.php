<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Memories\Visitor\ListVisitorMemoriesAction;
use App\Actions\Memories\Visitor\ResubmitVisitorMemoryAction;
use App\Actions\Memories\Visitor\SubmitVisitorMemoryAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Visitor\ResubmitVisitorMemoryRequest;
use App\Http\Requests\Visitor\StoreVisitorMemoryRequest;
use App\Http\Resources\Visitor\VisitorMemoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitorMemoryController extends Controller
{
    public function store(StoreVisitorMemoryRequest $request, SubmitVisitorMemoryAction $action): JsonResponse
    {
        $memory = $action->execute($request->user(), $request->photo(), $request->opinion());

        return (new VisitorMemoryResource($memory))->response()->setStatusCode(201);
    }

    public function index(Request $request, ListVisitorMemoriesAction $action): JsonResponse
    {
        $result = $action->execute($request->user());

        return response()->json([
            'data' => VisitorMemoryResource::collection($result['items'])->resolve($request),
            'meta' => $result['meta'],
        ]);
    }

    public function resubmit(ResubmitVisitorMemoryRequest $request, string $id, ResubmitVisitorMemoryAction $action): VisitorMemoryResource
    {
        return new VisitorMemoryResource(
            $action->execute($request->user(), $id, $request->photo(), $request->opinion())
        );
    }
}
