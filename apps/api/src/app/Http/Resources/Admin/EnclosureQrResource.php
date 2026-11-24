<?php

namespace App\Http\Resources\Admin;

use App\Actions\Admin\Enclosures\EnclosureQrResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property EnclosureQrResult $resource
 */
class EnclosureQrResource extends JsonResource
{
    public static $wrap = null;

    public function __construct(EnclosureQrResult $result, private ?string $svg, private bool $withDeactivated = false)
    {
        parent::__construct($result);
    }

    public function toArray(Request $request): array
    {
        $result = $this->resource;
        $body = [
            'enclosure' => [
                'id' => $result->enclosure->id,
                'name' => $result->enclosure->name,
                'is_active' => (bool) $result->enclosure->is_active,
            ],
            'qr' => $result->qr === null ? null : ['code' => $result->qr->code, 'svg' => $this->svg],
        ];

        if ($this->withDeactivated) {
            $body['deactivated'] = $result->deactivated();
        }

        return $body;
    }
}
