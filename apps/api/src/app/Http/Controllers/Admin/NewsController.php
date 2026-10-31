<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Content\DeleteNewsAction;
use App\Actions\Admin\Content\ListNewsAction;
use App\Actions\Admin\Content\SaveNewsAction;
use App\Actions\Admin\Content\SetNewsStatusAction;
use App\Actions\Admin\FindAdminResourceAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveNewsRequest;
use App\Http\Requests\Admin\SetStatusRequest;
use App\Http\Resources\Admin\NewsResource;
use App\Models\News;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class NewsController extends Controller
{
    private const NOT_FOUND = 'Noticia no encontrada.';

    public function index(ListNewsAction $action): AnonymousResourceCollection
    {
        return NewsResource::collection($action->execute());
    }

    public function store(SaveNewsRequest $request, SaveNewsAction $action): JsonResponse
    {
        return (new NewsResource($action->execute($request->user(), null, $request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function update(SaveNewsRequest $request, string $news, FindAdminResourceAction $find, SaveNewsAction $action): NewsResource
    {
        $model = $find->execute(News::class, $news, self::NOT_FOUND);

        return new NewsResource($action->execute($request->user(), $model, $request->validated()));
    }

    public function status(SetStatusRequest $request, string $news, FindAdminResourceAction $find, SetNewsStatusAction $action): NewsResource
    {
        $model = $find->execute(News::class, $news, self::NOT_FOUND);

        return new NewsResource($action->execute($model, $request->boolean('is_active')));
    }

    public function destroy(string $news, FindAdminResourceAction $find, DeleteNewsAction $action): Response
    {
        $action->execute($find->execute(News::class, $news, self::NOT_FOUND));

        return response()->noContent();
    }
}
