<?php

namespace App\Http\Controllers\Catalog;

use App\Actions\Catalog\GetPublishedNewsAction;
use App\Actions\Catalog\ListPublishedNewsAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListPublicNewsRequest;
use App\Http\Resources\Catalog\PublicNewsDetailResource;
use App\Http\Resources\Catalog\PublicNewsResource;
use Illuminate\Http\JsonResponse;

class NewsController extends Controller
{
    public function index(ListPublicNewsRequest $request, ListPublishedNewsAction $action): JsonResponse
    {
        $result = $action->execute($request->limit(), $request->page());

        return response()->json([
            'data' => PublicNewsResource::collection($result['items'])->resolve($request),
            'meta' => $result['meta'],
        ]);
    }

    public function show(string $news, GetPublishedNewsAction $action): PublicNewsDetailResource
    {
        abort_unless(ctype_digit($news), 404, 'Noticia no encontrada.');

        $model = $action->execute((int) $news);

        abort_if($model === null, 404, 'Noticia no encontrada.');

        return new PublicNewsDetailResource($model);
    }
}
