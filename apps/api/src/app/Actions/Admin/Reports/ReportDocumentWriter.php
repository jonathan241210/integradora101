<?php

namespace App\Actions\Admin\Reports;

use Dompdf\Dompdf;
use Dompdf\Options;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Renderiza un ReportDocument a CSV (UTF-8 con BOM), Excel (OpenSpout) o PDF (Dompdf), sin dependencias nuevas
 * (ADR 0017). No toca los writers de api-007: comparte solo el patrón (decisión de plan, «Alternativa»).
 */
class ReportDocumentWriter
{
    /** @param  resource  $handle */
    public function csv($handle, ReportDocument $document): void
    {
        fwrite($handle, "\xEF\xBB\xBF");

        foreach ($this->lines($document) as $values) {
            if ($values === []) {
                fwrite($handle, "\r\n");

                continue;
            }
            fputcsv($handle, array_map([$this, 'sanitize'], $values), ',', '"', '\\', "\r\n");
        }
    }

    /** @param  resource  $handle */
    public function xlsx($handle, ReportDocument $document): void
    {
        // El zip necesita un destino con acceso aleatorio: se escribe a un temporal y se copia a la salida.
        $path = ReportTempDirectory::file('xlsx-');

        try {
            $writer = new Writer;
            $writer->openToFile($path);
            foreach ($this->lines($document) as $values) {
                $writer->addRow(Row::fromValues(array_map([$this, 'sanitize'], $values)));
            }
            $writer->close();

            $file = fopen($path, 'rb');
            stream_copy_to_stream($file, $handle);
            fclose($file);
        } finally {
            @unlink($path);
        }
    }

    /** @param  resource  $handle */
    public function pdf($handle, ReportDocument $document): void
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('isPhpEnabled', false);
        $options->set('isJavascriptEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('tempDir', ReportTempDirectory::path());
        $options->set('fontCache', ReportTempDirectory::path());

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($this->html($document), 'UTF-8');
        $dompdf->setPaper('letter', 'landscape');
        $dompdf->render();

        fwrite($handle, $dompdf->output());
    }

    /** @return list<list<mixed>> */
    private function lines(ReportDocument $document): array
    {
        $lines = [[$document->title]];
        foreach ($document->metadata as $pair) {
            $lines[] = [$pair[0], $pair[1]];
        }
        foreach ($document->sections as $section) {
            $lines[] = [];
            $lines[] = [$section['title']];
            $lines[] = $section['headers'];
            foreach ($section['rows'] as $row) {
                $lines[] = $row;
            }
        }

        return $lines;
    }

    private function html(ReportDocument $document): string
    {
        $meta = '';
        foreach ($document->metadata as $pair) {
            $meta .= '<b>'.$this->e($pair[0]).':</b> '.$this->e($pair[1]).'<br>';
        }
        $sections = '';
        foreach ($document->sections as $section) {
            $sections .= '<h2>'.$this->e($section['title']).'</h2><table>'.$this->tr($section['headers'], 'th');
            foreach ($section['rows'] as $row) {
                $sections .= $this->tr($row);
            }
            $sections .= '</table>';
        }

        return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>'
            .'body{font-family:"DejaVu Sans",sans-serif;font-size:9px;color:#222}'
            .'h1{font-size:16px}h2{font-size:12px;margin-top:16px}'
            .'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px 5px;text-align:left}'
            .'th{background:#eee}'
            .'</style></head><body><h1>'.$this->e($document->title).'</h1><p>'.$meta.'</p>'.$sections.'</body></html>';
    }

    private function tr(array $cells, string $tag = 'td'): string
    {
        return '<tr>'.implode('', array_map(fn ($cell) => "<{$tag}>".$this->e((string) $cell)."</{$tag}>", $cells)).'</tr>';
    }

    private function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /** Neutraliza inyección de fórmulas en celdas de texto (el comentario es texto libre). */
    private function sanitize(mixed $value): mixed
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }
}
