<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\RecordVisitorDiscoveryAction;
use App\Actions\Visitor\VisitorProgressQuery;
use App\Http\Requests\Visitor\StoreVisitorDiscoveryRequest;
use App\Models\Visitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitorProgressController extends VisitorController
{
    public function store(StoreVisitorDiscoveryRequest $request, RecordVisitorDiscoveryAction $action): JsonResponse
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();
        $result = $action->execute($visitor, $request->validated());

        if ($result['status'] === 429) {
            return response()->json($result['body'], 429);
        }

        $body = ['data' => $result['body']];
        if (isset($result['body']['code'])) {
            $body['code'] = $result['body']['code'];
            $body['message'] = $result['body']['message'];
        }

        return response()->json($body, $result['status']);
    }

    public function progress(Request $request, VisitorProgressQuery $query): JsonResponse
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return response()->json(['data' => $query->progress($visitor)]);
    }

    public function collection(Request $request, VisitorProgressQuery $query): JsonResponse
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return response()->json(['data' => $query->collection($visitor)]);
    }

    public function achievements(Request $request, VisitorProgressQuery $query): JsonResponse
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return response()->json(['data' => $query->achievements($visitor)]);
    }

    public function missions(Request $request, VisitorProgressQuery $query): JsonResponse
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return response()->json(['data' => $query->missions($visitor)]);
    }
}
