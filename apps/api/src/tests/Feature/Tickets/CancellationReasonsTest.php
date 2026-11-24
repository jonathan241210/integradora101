<?php

namespace Tests\Feature\Tickets;

class CancellationReasonsTest extends TicketFeatureTestCase
{
    private const URL = '/api/v1/admin/tickets/cancellation-reasons';

    /** CA-10 ticket-cancellation-report */
    public function test_ca10_returns_five_codes_in_order_with_labels(): void
    {
        $expected = [
            ['code' => 'capture_error', 'label' => 'Error de captura', 'comment_policy' => 'optional'],
            ['code' => 'duplicate_charge', 'label' => 'Cobro duplicado', 'comment_policy' => 'optional'],
            ['code' => 'wrong_ticket_type', 'label' => 'Tipo de boleto equivocado', 'comment_policy' => 'optional'],
            ['code' => 'visitor_withdrew', 'label' => 'El visitante desistió', 'comment_policy' => 'optional'],
            ['code' => 'other', 'label' => 'Otro', 'comment_policy' => 'required'],
        ];

        // El cajero cancela; el admin lo consulta para el filtro del reporte (reports.cancellations.view).
        foreach (['cashier', 'admin'] as $role) {
            $this->actAs($this->createAccount($role))->getJson(self::URL)->assertOk()->assertExactJson(['data' => $expected]);
        }
    }

    /** CA-10 ticket-cancellation-report */
    public function test_ca10_without_cancel_or_report_permission_is_403(): void
    {
        foreach (['zoo-admin', 'executive', 'veterinarian'] as $role) {
            $this->actAs($this->createAccount($role))->getJson(self::URL)->assertForbidden();
        }
    }
}
