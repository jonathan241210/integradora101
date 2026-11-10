<?php

namespace App\Actions\Admin\Content;

use Illuminate\Validation\ValidationException;

/**
 * Quita metadatos y datos HDR recortando el contenedor, sin decodificar la imagen (api-008 CA-14, CA-15):
 * los píxeles no cambian y se conservan el perfil de color y la orientación. Lo que no se reconoce se descarta.
 */
class StripImageMetadataAction
{
    private const PNG_SIGNATURE = "\x89PNG\r\n\x1A\n";

    private const PNG_KEPT_CHUNKS = ['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'cHRM', 'gAMA', 'iCCP', 'sBIT', 'sRGB', 'bKGD', 'pHYs', 'acTL', 'fcTL', 'fdAT'];

    private const WEBP_KEPT_CHUNKS = ['VP8X', 'ICCP', 'ANIM', 'ANMF', 'ALPH', 'VP8 ', 'VP8L'];

    private const WEBP_EXIF_FLAG = 0x08;

    private const WEBP_XMP_FLAG = 0x04;

    public function execute(string $bytes, string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg' => $this->jpeg($bytes),
            'image/png' => $this->png($bytes),
            'image/webp' => $this->webp($bytes),
            default => $this->fail(),
        };
    }

    private function jpeg(string $bytes): string
    {
        if (! str_starts_with($bytes, "\xFF\xD8")) {
            $this->fail();
        }

        $length = strlen($bytes);
        $offset = 2;
        $jfif = '';
        $exif = '';
        $kept = '';

        while ($offset + 1 < $length) {
            if ($bytes[$offset] !== "\xFF") {
                $this->fail();
            }

            $marker = ord($bytes[$offset + 1]);

            if ($marker === 0xFF) {
                $offset++;

                continue;
            }

            if ($marker === 0xD9) {
                return "\xFF\xD8".$jfif.$exif.$kept."\xFF\xD9"; // Lo que sigue (mapa de ganancia, otras imágenes) se descarta.
            }

            if ($marker === 0x01 || ($marker >= 0xD0 && $marker <= 0xD7)) {
                $kept .= "\xFF".chr($marker);
                $offset += 2;

                continue;
            }

            $size = $this->bigEndian($bytes, $offset + 2, 2);
            $end = $offset + 2 + $size;

            if ($size < 2 || $end > $length) {
                $this->fail();
            }

            $segment = substr($bytes, $offset, 2 + $size);
            $payload = substr($bytes, $offset + 4, $size - 2);
            $offset = $end;

            if ($marker === 0xE0) {
                if (str_starts_with($payload, "JFIF\0") && strlen($payload) >= 14) {
                    $jfif = "\xFF\xE0\x00\x10".substr($payload, 0, 12)."\0\0"; // Sin miniatura.
                }
            } elseif ($marker === 0xE1) {
                if (str_starts_with($payload, "Exif\0\0")) {
                    $orientation = $this->orientationFromTiff(substr($payload, 6));

                    if ($orientation !== null) {
                        $data = "Exif\0\0".$this->orientationTiff($orientation);
                        $exif = "\xFF\xE1".pack('n', strlen($data) + 2).$data;
                    }
                }
            } elseif ($marker === 0xE2) {
                if (str_starts_with($payload, "ICC_PROFILE\0")) {
                    $kept .= $segment;
                }
            } elseif ($marker === 0xEE) {
                if (str_starts_with($payload, 'Adobe')) {
                    $kept .= $segment; // Indica la transformación de color; quitarlo altera los colores.
                }
            } elseif (($marker >= 0xE3 && $marker <= 0xEF) || $marker === 0xFE) {
                continue;
            } elseif ($marker === 0xDA) {
                $scanEnd = $this->jpegScanEnd($bytes, $offset);
                $kept .= $segment.substr($bytes, $offset, $scanEnd - $offset);
                $offset = $scanEnd;
            } else {
                $kept .= $segment;
            }
        }

        $this->fail();
    }

    /** Posición del siguiente marcador tras los datos de un escaneo. */
    private function jpegScanEnd(string $bytes, int $offset): int
    {
        $length = strlen($bytes);

        while (($position = strpos($bytes, "\xFF", $offset)) !== false && $position + 1 < $length) {
            $next = ord($bytes[$position + 1]);

            if ($next !== 0x00 && ($next < 0xD0 || $next > 0xD7)) {
                return $position;
            }

            $offset = $position + 2;
        }

        $this->fail();
    }

    private function png(string $bytes): string
    {
        if (! str_starts_with($bytes, self::PNG_SIGNATURE)) {
            $this->fail();
        }

        $length = strlen($bytes);
        $offset = strlen(self::PNG_SIGNATURE);
        $header = '';
        $exif = '';
        $kept = '';

        while ($offset + 12 <= $length) {
            $size = $this->bigEndian($bytes, $offset, 4);
            $type = substr($bytes, $offset + 4, 4);
            $end = $offset + 12 + $size;

            if ($end > $length) {
                $this->fail();
            }

            $chunk = substr($bytes, $offset, 12 + $size);
            $offset = $end;

            if ($type === 'IHDR') {
                $header = $chunk;
            } elseif ($type === 'eXIf') {
                $orientation = $this->orientationFromTiff(substr($chunk, 8, $size));

                if ($orientation !== null) {
                    $data = 'eXIf'.$this->orientationTiff($orientation);
                    $exif = pack('N', strlen($data) - 4).$data.pack('N', crc32($data));
                }
            } elseif (in_array($type, self::PNG_KEPT_CHUNKS, true)) {
                $kept .= $chunk;
            }

            if ($type === 'IEND') {
                if ($header === '') {
                    $this->fail();
                }

                return self::PNG_SIGNATURE.$header.$exif.$kept;
            }
        }

        $this->fail();
    }

    private function webp(string $bytes): string
    {
        if (strlen($bytes) < 12 || ! str_starts_with($bytes, 'RIFF') || substr($bytes, 8, 4) !== 'WEBP') {
            $this->fail();
        }

        $end = min(strlen($bytes), 8 + unpack('V', substr($bytes, 4, 4))[1]);
        $offset = 12;
        $orientation = null;
        $chunks = [];

        while ($offset + 8 <= $end) {
            $type = substr($bytes, $offset, 4);
            $size = unpack('V', substr($bytes, $offset + 4, 4))[1];

            if ($offset + 8 + $size > $end) {
                $this->fail();
            }

            $data = substr($bytes, $offset + 8, $size);
            $offset += 8 + $size + ($size % 2);

            if ($type === 'EXIF') {
                $orientation = $this->orientationFromTiff(str_starts_with($data, "Exif\0\0") ? substr($data, 6) : $data);
            } elseif (in_array($type, self::WEBP_KEPT_CHUNKS, true)) {
                $chunks[] = [$type, $data];
            }
        }

        if (array_intersect(array_column($chunks, 0), ['VP8 ', 'VP8L', 'ANMF']) === []) {
            $this->fail();
        }

        $hasExtendedHeader = false;

        foreach ($chunks as $index => [$type, $data]) {
            if ($type === 'VP8X' && $data !== '') {
                $flags = ord($data[0]) & ~(self::WEBP_EXIF_FLAG | self::WEBP_XMP_FLAG);
                $chunks[$index][1] = chr($orientation !== null ? $flags | self::WEBP_EXIF_FLAG : $flags).substr($data, 1);
                $hasExtendedHeader = true;
            }
        }

        // Sin VP8X, el formato no admite un bloque EXIF.
        if ($orientation !== null && $hasExtendedHeader) {
            $chunks[] = ['EXIF', $this->orientationTiff($orientation)];
        }

        $body = 'WEBP';

        foreach ($chunks as [$type, $data]) {
            $body .= $type.pack('V', strlen($data)).$data.(strlen($data) % 2 === 1 ? "\0" : '');
        }

        return 'RIFF'.pack('V', strlen($body)).$body;
    }

    /** Orientación distinta de la normal (2 a 8) o null. */
    private function orientationFromTiff(string $tiff): ?int
    {
        if (strlen($tiff) < 8) {
            return null;
        }

        $marker = substr($tiff, 0, 2);

        if ($marker !== 'II' && $marker !== 'MM') {
            return null;
        }

        $short = $marker === 'II' ? 'v' : 'n';
        $long = $marker === 'II' ? 'V' : 'N';
        $directory = unpack($long, substr($tiff, 4, 4))[1];

        if ($directory + 2 > strlen($tiff)) {
            return null;
        }

        $entries = unpack($short, substr($tiff, $directory, 2))[1];

        for ($index = 0; $index < $entries; $index++) {
            $entry = $directory + 2 + ($index * 12);

            if ($entry + 12 > strlen($tiff)) {
                return null;
            }

            if (unpack($short, substr($tiff, $entry, 2))[1] === 0x0112) {
                $value = unpack($short, substr($tiff, $entry + 8, 2))[1];

                return $value >= 2 && $value <= 8 ? $value : null;
            }
        }

        return null;
    }

    /** TIFF mínimo cuya única etiqueta es la orientación. */
    private function orientationTiff(int $orientation): string
    {
        return "MM\0*".pack('N', 8).pack('n', 1).pack('nnNnn', 0x0112, 3, 1, $orientation, 0).pack('N', 0);
    }

    private function bigEndian(string $bytes, int $offset, int $width): int
    {
        if ($offset + $width > strlen($bytes)) {
            $this->fail();
        }

        return unpack($width === 2 ? 'n' : 'N', substr($bytes, $offset, $width))[1];
    }

    private function fail(): never
    {
        throw ValidationException::withMessages(['image' => 'No se pudo procesar la imagen. Prueba con otro archivo.']);
    }
}
