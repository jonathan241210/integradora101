<?php

namespace Tests\Feature\Tickets;

use App\Enums\TicketCancellationReason;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class CancelTicketReasonTest extends TicketFeatureTestCase
{
    private function newSale(): array
    {
        $cashier = $this->createAccount('cashier');
        $this->setPrices($cashier);

        return [$cashier, "/api/v1/admin/tickets/{$this->sell($cashier)['folio']}/cancel"];
    }

    private function assertUntouched(string $url): void
    {
        $ticket = Ticket::query()->findOrFail((int) basename(dirname($url)));
        $this->assertSame('completed', $ticket->status);
        $this->assertNull($ticket->cancellation_reason_code);
        $this->assertNull($ticket->cancellation_reason);
    }

    /** CA-11 ticket-cancellation-report */
    public function test_ca11_missing_or_unknown_reason_code_is_422_and_no_change(): void
    {
        [$cashier, $url] = $this->newSale();

        $this->actAs($cashier)->postJson($url, [])->assertStatus(422)
            ->assertJsonPath('message', 'Selecciona un motivo de cancelación.')->assertJsonValidationErrors(['reason_code'], 'errors');
        foreach (['nope', 'Other', 5, ['x']] as $code) {
            $this->actAs($cashier)->postJson($url, ['reason_code' => $code])->assertStatus(422)
                ->assertJsonPath('message', 'El motivo elegido no es válido.')->assertJsonValidationErrors(['reason_code'], 'errors');
        }
        $this->assertUntouched($url);
    }

    /** CA-12 ticket-cancellation-report */
    public function test_ca12_other_comment_length_14_or_256_is_422_and_15_or_255_is_accepted(): void
    {
        [$cashier, $url] = $this->newSale();

        foreach ([null, '', '   ', str_repeat('a', 14), '  '.str_repeat('a', 14).'  '] as $comment) {
            $this->actAs($cashier)->postJson($url, ['reason_code' => 'other', 'reason' => $comment])->assertStatus(422)
                ->assertJsonPath('message', 'Describe el motivo con al menos 15 caracteres.')->assertJsonValidationErrors(['reason'], 'errors');
        }
        $this->actAs($cashier)->postJson($url, ['reason_code' => 'other', 'reason' => str_repeat('a', 256)])->assertStatus(422)
            ->assertJsonValidationErrors(['reason'], 'errors');
        $this->assertUntouched($url);

        $this->actAs($cashier)->postJson($url, ['reason_code' => 'other', 'reason' => str_repeat('ñ', 15)])->assertOk();

        [$cashier, $url] = $this->newSale();
        $this->actAs($cashier)->postJson($url, ['reason_code' => 'other', 'reason' => str_repeat('a', 255)])->assertOk();
    }

    /** CA-13 ticket-cancellation-report */
    public function test_ca13_saves_code_and_comment_separately_without_label(): void
    {
        [$cashier, $url] = $this->newSale();

        $this->actAs($cashier)->postJson($url, ['reason_code' => 'duplicate_charge', 'reason' => '  Cobro repetido en caja  '])
            ->assertOk()
            ->assertJsonPath('data.cancellation_reason_code', 'duplicate_charge')
            ->assertJsonPath('data.cancellation_reason_label', 'Cobro duplicado')
            ->assertJsonPath('data.cancellation_reason', 'Cobro repetido en caja');

        $row = DB::table('tickets')->find((int) basename(dirname($url)));
        $this->assertSame('duplicate_charge', $row->cancellation_reason_code);
        $this->assertSame('Cobro repetido en caja', $row->cancellation_reason);
        $this->assertNull($row->deleted_at);
    }

    /** CA-23 ticket-cancellation-report */
    public function test_ca23_cancel_audit_records_actor_folio_amount_code_and_comment_without_secrets(): void
    {
        [$cashier, $url] = $this->newSale();
        $folio = (int) basename(dirname($url));

        $this->actAs($cashier)->postJson($url, ['reason_code' => 'other', 'reason' => 'Comentario de auditoría largo', 'password' => 'secreto-no-debe-salir'])->assertOk();

        $log = Activity::query()->where('event', 'ticket-cancelled')->where('subject_id', $folio)->firstOrFail();
        $this->assertSame($cashier->id, (int) $log->causer_id);
        $this->assertSame($folio, $log->properties['folio']);
        $this->assertSame('25.00', $log->properties['total_amount']);
        $this->assertSame('other', $log->properties['reason_code']);
        $this->assertSame('Comentario de auditoría largo', $log->properties['reason']);
        $this->assertStringNotContainsString('secreto', json_encode($log->properties));

        // Un boleto cancelado no se cancela otra vez (api-009 CA-12).
        $this->actAs($cashier)->postJson($url, ['reason_code' => 'capture_error'])->assertStatus(422)
            ->assertJsonPath('message', 'Este boleto ya está cancelado.');
    }

    /** CA-24 ticket-cancellation-report */
    public function test_ca24_non_other_code_accepts_optional_comment_up_to_255_and_rejects_256(): void
    {
        foreach (TicketCancellationReason::cases() as $reason) {
            if ($reason === TicketCancellationReason::Other) {
                continue;
            }
            [$cashier, $url] = $this->newSale();
            $this->actAs($cashier)->postJson($url, ['reason_code' => $reason->value, 'reason' => str_repeat('a', 256)])->assertStatus(422)
                ->assertJsonValidationErrors(['reason'], 'errors');
            $this->assertUntouched($url);

            $this->actAs($cashier)->postJson($url, ['reason_code' => $reason->value, 'reason' => str_repeat('a', 255)])->assertOk();
            $this->assertSame(str_repeat('a', 255), Ticket::findOrFail((int) basename(dirname($url)))->cancellation_reason);
        }

        [$cashier, $url] = $this->newSale();
        foreach ([[], ['reason' => ''], ['reason' => '   ']] as $extra) {
            [$cashier, $url] = $this->newSale();
            $this->actAs($cashier)->postJson($url, ['reason_code' => 'capture_error'] + $extra)->assertOk();
            $ticket = Ticket::findOrFail((int) basename(dirname($url)));
            $this->assertSame(TicketCancellationReason::CaptureError, $ticket->cancellation_reason_code);
            $this->assertNull($ticket->cancellation_reason);
        }
    }
}
