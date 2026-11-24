<?php

namespace App\Http\Requests\Admin\Tickets;

class ExportCancellationReportRequest extends CancellationReportRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'format' => ['required', 'in:'.implode(',', config('arca.report_export_formats'))],
        ];
    }

    public function messages(): array
    {
        return parent::messages() + [
            'format.required' => 'Formato de exportación no disponible.',
            'format.in' => 'Formato de exportación no disponible.',
        ];
    }
}
