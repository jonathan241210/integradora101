<?php

namespace App\Actions\Admin\Tickets;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/**
 * SVG del QR generado en memoria con bacon/bacon-qr-code (ADR 0019). Nunca se persiste.
 */
class RenderTicketQrSvgAction
{
    public function execute(string $token): string
    {
        $renderer = new ImageRenderer(new RendererStyle(256, 2), new SvgImageBackEnd);

        return (new Writer($renderer))->writeString($token);
    }
}
