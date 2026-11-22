<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Reports\ListCancellationReviewsAction;
use App\Actions\Admin\Reports\PresentCancellationReview;
use App\Actions\Admin\Reports\RecordCancellationReviewAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Reports\ListCancellationReviewsRequest;
use App\Http\Requests\Admin\Reports\StoreCancellationReviewRequest;
use Illuminate\Http\JsonResponse;

class CancellationReviewController extends Controller
{
    public function index(ListCancellationReviewsRequest $request, ListCancellationReviewsAction $action): JsonResponse
    {
        return response()->json(['data' => $action->execute((int) $request->validated('cashier_id'), $request->validated('business_date'))]);
    }

    public function store(StoreCancellationReviewRequest $request, RecordCancellationReviewAction $action): JsonResponse
    {
        $review = $action->execute($request->user(), $request->validated());

        return response()->json(['data' => PresentCancellationReview::from($review)], 201);
    }
}
