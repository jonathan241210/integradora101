<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Memories\Review\AcceptMemoryAction;
use App\Actions\Memories\Review\ListMemoriesForReviewAction;
use App\Actions\Memories\Review\RejectMemoryAction;
use App\Actions\Memories\Review\ShowMemoryForReviewAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListMemoriesForReviewRequest;
use App\Http\Requests\Admin\RejectMemoryRequest;
use App\Http\Resources\Admin\MemoryReviewDetailResource;
use App\Http\Resources\Admin\MemoryReviewResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemoryReviewController extends Controller
{
    public function index(ListMemoriesForReviewRequest $request, ListMemoriesForReviewAction $action): JsonResponse
    {
        $result = $action->execute($request->status(), $request->page(), $request->limit());

        return response()->json([
            'data' => MemoryReviewResource::collection($result['items'])->resolve($request),
            'meta' => $result['meta'],
        ]);
    }

    public function show(Request $request, string $id, ShowMemoryForReviewAction $action): MemoryReviewDetailResource
    {
        return new MemoryReviewDetailResource($action->execute($id));
    }

    public function reject(RejectMemoryRequest $request, string $id, RejectMemoryAction $action): MemoryReviewDetailResource
    {
        return new MemoryReviewDetailResource(
            $action->execute($request->user(), $id, $request->validated('rejection_reason'), $request->rejectedFields())
        );
    }

    public function accept(Request $request, string $id, AcceptMemoryAction $action): MemoryReviewDetailResource
    {
        return new MemoryReviewDetailResource($action->execute($request->user(), $id));
    }
}
