<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\DeleteVisitorPushTokenAction;
use App\Actions\Visitor\UpsertVisitorPushTokenAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Visitor\DeleteVisitorPushTokenRequest;
use App\Http\Requests\Visitor\UpsertVisitorPushTokenRequest;
use App\Models\Visitor;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class VisitorPushTokenController extends Controller
{
    public function store(UpsertVisitorPushTokenRequest $request, UpsertVisitorPushTokenAction $action): JsonResponse
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();
        $action->execute($visitor, $request->string('token')->toString(), $request->string('platform')->toString());

        return response()->json([
            'data' => ['platform' => 'android'],
        ]);
    }

    public function destroy(DeleteVisitorPushTokenRequest $request, DeleteVisitorPushTokenAction $action): Response
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();
        $deleted = $action->execute($visitor, $request->string('token')->toString());

        if (! $deleted) {
            return response()->json(['message' => 'No encontramos ese teléfono.'], 404);
        }

        return response()->noContent();
    }
}
