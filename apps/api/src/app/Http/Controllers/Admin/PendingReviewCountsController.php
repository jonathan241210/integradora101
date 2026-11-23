<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\PendingReview\GetPendingReviewCountsAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PendingReviewCountsController extends Controller
{
    public function __invoke(Request $request, GetPendingReviewCountsAction $action): JsonResponse
    {
        return response()->json($action->execute($request->user()));
    }
}
