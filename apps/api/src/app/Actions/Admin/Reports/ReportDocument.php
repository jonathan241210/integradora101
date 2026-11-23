<?php

namespace App\Actions\Admin\Reports;

/**
 * Documento de reporte común a CSV, Excel y PDF (api-022 CA-19): título, bloque de metadatos y secciones
 * con cabeceras y filas ya presentadas como texto. Los tres formatos salen del mismo documento.
 */
final class ReportDocument
{
    /**
     * @param  list<array{0: string, 1: string}>  $metadata  pares etiqueta/valor
     * @param  list<array{title: string, headers: list<string>, rows: list<list<scalar|null>>}>  $sections
     */
    public function __construct(
        public readonly string $title,
        public readonly array $metadata,
        public readonly array $sections,
    ) {}
}
