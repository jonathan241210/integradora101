<?php

namespace App\Http\Requests\Admin;

class ExportTicketReportRequest extends TicketReportRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'format' => ['required', 'in:csv,xlsx,pdf'],
        ];
    }
}
