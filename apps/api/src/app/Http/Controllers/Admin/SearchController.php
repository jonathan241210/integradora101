<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Search\GlobalSearchAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\GlobalSearchRequest;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    public function __invoke(GlobalSearchRequest $request, GlobalSearchAction $action): JsonResponse
    {
        return response()->json(['groups' => $action->execute($request->user(), $request->term())]);
    }
}
