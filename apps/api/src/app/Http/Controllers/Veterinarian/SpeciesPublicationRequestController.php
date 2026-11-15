<?php

namespace App\Http\Controllers\Veterinarian;

use App\Actions\Veterinarian\SpeciesPublication\ListOwnSpeciesPublicationRequestsAction;
use App\Actions\Veterinarian\SpeciesPublication\SubmitSpeciesPublicationRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Veterinarian\StoreSpeciesPublicationRequest;
use App\Http\Resources\Veterinarian\OwnSpeciesPublicationRequestResource;
use App\Http\Resources\Veterinarian\SubmittedSpeciesPublicationRequestResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpeciesPublicationRequestController extends Controller
{
    public function index(Request $request, ListOwnSpeciesPublicationRequestsAction $action): JsonResponse
    {
        $page = $action->execute($request->user());

        return response()->json([
            'data' => OwnSpeciesPublicationRequestResource::collection($page->getCollection())->resolve($request),
            'meta' => ['has_more' => $page->hasMorePages()],
        ]);
    }

    public function store(StoreSpeciesPublicationRequest $request, SubmitSpeciesPublicationRequestAction $action): JsonResponse
    {
        $data = $request->safe()->except(['published_fields', 'image']);
        $data['published_fields'] = $request->publishedFields();

        $created = $action->execute($request->user(), $data, $request->file('image'));

        return (new SubmittedSpeciesPublicationRequestResource($created))
            ->response()
            ->setStatusCode(201);
    }
}
