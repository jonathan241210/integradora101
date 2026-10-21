<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\VisitorAuthResult;
use App\Http\Controllers\Controller;
use App\Http\Resources\VisitorTokenResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

abstract class VisitorController extends Controller
{
    protected function respond(VisitorAuthResult $result): JsonResponse|Response
    {
        if ($result->accessToken !== null && $result->visitor !== null) {
            return VisitorTokenResource::make([
                'access_token' => $result->accessToken,
                'refresh_token' => $result->refreshToken,
                'visitor' => $result->visitor,
            ])->response()->setStatusCode($result->status);
        }

        if ($result->status === 204) {
            return response()->noContent();
        }

        $body = ['message' => $result->message];
        if ($result->code !== null) {
            $body['code'] = $result->code;
        }

        return response()->json($body, $result->status);
    }
}
