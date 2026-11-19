<?php

namespace App\Actions\Admin\Enclosures;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/** SVG del QR de un recinto en memoria (api-020 RN-08, ADR 0019). Nunca se persiste. */
class RenderEnclosureQrSvgAction
{
    public function execute(string $code): string
    {
        $renderer = new ImageRenderer(new RendererStyle(256, 2), new SvgImageBackEnd);

        return (new Writer($renderer))->writeString($code);
    }
}
