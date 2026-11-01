<?php

namespace App\Actions\Admin\Reports;

use RuntimeException;

/**
 * Directorio dedicado (no versionado, modo 0700) para los temporales de exportación.
 */
class ReportTempDirectory
{
    public static function path(): string
    {
        $path = storage_path('app/tmp-reports');

        if (! is_dir($path) && ! @mkdir($path, 0700, true) && ! is_dir($path)) {
            throw new RuntimeException('No se pudo crear el directorio temporal de reportes.');
        }

        return $path;
    }

    /** Crea un archivo temporal único dentro del directorio dedicado. */
    public static function file(string $prefix): string
    {
        $file = tempnam(self::path(), $prefix);

        if ($file === false) {
            throw new RuntimeException('No se pudo crear el archivo temporal del reporte.');
        }

        return $file;
    }
}
