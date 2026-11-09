<?php

namespace Tests\Feature\Tickets;

use App\Actions\Admin\Tickets\CancelTicketAction;
use App\Models\Ticket;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CancelTicketOrderTest extends TicketFeatureTestCase
{
    public function test_ca13_ticket_sales_validation_order_is_403_404_reason_already_cancelled_other_day(): void
    {
        $owner = $this->createAccount('cashier', false);
        $other = $this->createAccount('cashier', false);
        $this->setPrices($owner);
        $this->travelTo($this->at('2026-11-02 18:00:00'));

        $oldCompleted = $this->insertSale($owner, '2026-11-02 03:00:00'); // D-1 en Ciudad de México
        $oldCancelled = $this->insertSale($owner, '2026-11-02 03:00:00', ['status' => 'cancelled', 'cancelled_at' => '2026-11-02 03:30:00']);
        $url = fn (int $id) => "/api/v1/admin/tickets/{$id}/cancel";

        // 1) 403 antes que cualquier otra validación (cuerpo vacío, boleto ajeno).
        $this->actAs($this->createAccount('admin'))->postJson($url($oldCompleted), [])->assertForbidden();
        // 2) 404 de alcance antes que el 422 de motivo.
        $this->actAs($other)->postJson($url($oldCompleted), [])->assertNotFound()->assertJsonPath('message', 'Boleto no encontrado.');
        // 3) 422 de motivo antes que "ya cancelado" y "otro día".
        $this->actAs($owner)->postJson($url($oldCancelled), [])
            ->assertStatus(422)->assertJsonValidationErrors(['reason'], 'errors');
        $this->actAs($owner)->postJson($url($oldCompleted), [])
            ->assertStatus(422)->assertJsonValidationErrors(['reason'], 'errors');
        // 4) "ya cancelado" antes que "otro día" (el boleto cancelado también es de otro día).
        $this->actAs($owner)->postJson($url($oldCancelled), ['reason' => 'X'])
            ->assertStatus(422)->assertJsonPath('message', 'Este boleto ya está cancelado.');
        // 5) por último, otro día.
        $this->actAs($owner)->postJson($url($oldCompleted), ['reason' => 'X'])
            ->assertStatus(422)->assertJsonPath('message', 'Solo se pueden cancelar boletos el mismo día en que se vendieron.');

        $this->assertSame('completed', Ticket::query()->findOrFail($oldCompleted)->status);
    }

    public function test_ca13_ticket_sales_ticket_deleted_between_authorization_and_lock_is_404(): void
    {
        $cashier = $this->createAccount('cashier', false);
        $this->setPrices($cashier);
        $sale = $this->sell($cashier);
        $ticket = Ticket::query()->findOrFail($sale['folio']);
        $cancelledEvents = $this->activityCount('ticket-cancelled'); // la base de pruebas puede tener eventos previos
        $ticket->delete(); // borrado lógico entre el authorize() y el bloqueo

        try {
            app(CancelTicketAction::class)->execute($cashier, $ticket, 'Carrera');
            $this->fail('Se esperaba un 404.');
        } catch (NotFoundHttpException $e) {
            $this->assertSame('Boleto no encontrado.', $e->getMessage());
            $this->assertSame(404, $e->getStatusCode());
        }
        $this->assertSame($cancelledEvents, $this->activityCount('ticket-cancelled'));
    }
}
