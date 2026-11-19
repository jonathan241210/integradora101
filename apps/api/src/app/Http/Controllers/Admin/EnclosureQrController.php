<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\Enclosures\EnclosureQrResult;
use App\Actions\Admin\Enclosures\GenerateEnclosureQrAction;
use App\Actions\Admin\Enclosures\GetEnclosureQrAction;
use App\Actions\Admin\Enclosures\RegenerateEnclosureQrAction;
use App\Actions\Admin\Enclosures\RenderEnclosureQrSvgAction;
use App\Actions\Admin\FindAdminResourceAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\EnclosureQrResource;
use App\Models\Enclosure;
use Illuminate\Http\JsonResponse;

class EnclosureQrController extends Controller
{
    public function show(
        string $enclosure,
        FindAdminResourceAction $find,
        GetEnclosureQrAction $action,
        RenderEnclosureQrSvgAction $svg,
    ): JsonResponse {
        $result = $action->execute($this->enclosure($find, $enclosure));

        return $this->respond($result, $svg, 200);
    }

    public function generate(
        string $enclosure,
        FindAdminResourceAction $find,
        GenerateEnclosureQrAction $action,
        RenderEnclosureQrSvgAction $svg,
    ): JsonResponse {
        $result = $action->execute($this->enclosure($find, $enclosure));

        return $this->respond($result, $svg, $result->created ? 201 : 200);
    }

    public function regenerate(
        string $enclosure,
        FindAdminResourceAction $find,
        RegenerateEnclosureQrAction $action,
        RenderEnclosureQrSvgAction $svg,
    ): JsonResponse {
        $result = $action->execute($this->enclosure($find, $enclosure));

        return $this->respond($result, $svg, 200, true);
    }

    private function enclosure(FindAdminResourceAction $find, string $id): Enclosure
    {
        /** @var Enclosure */
        return $find->execute(Enclosure::class, $id, 'Recinto no encontrado.');
    }

    private function respond(EnclosureQrResult $result, RenderEnclosureQrSvgAction $svg, int $status, bool $withDeactivated = false): JsonResponse
    {
        $image = $result->qr === null ? null : $svg->execute($result->qr->code);

        return (new EnclosureQrResource($result, $image, $withDeactivated))->response()->setStatusCode($status);
    }
}
