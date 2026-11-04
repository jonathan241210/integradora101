<?php

namespace Tests\Feature\Tickets;

use App\Models\TicketPrice;

class TicketPriceValidationTest extends TicketFeatureTestCase
{
    public function test_ca20_ticket_sales_rejects_scheduled_changes_in_the_past_or_without_offset(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-02 12:00:00'));
        $rows = TicketPrice::query()->count();

        foreach (['2026-11-02T11:59:59Z', '2026-11-01T00:00:00-06:00'] as $past) {
            $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
                'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => $past,
            ])->assertStatus(422)->assertJsonValidationErrors(['effective_at'], 'errors');
        }
        // Sin desfase horario (decisión 3 del plan) y ausente en modo scheduled.
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => '2026-12-01 09:00:00',
        ])->assertStatus(422)->assertJsonValidationErrors(['effective_at'], 'errors');
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
            'adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled',
        ])->assertStatus(422)->assertJsonValidationErrors(['effective_at'], 'errors');

        $this->assertSame($rows, TicketPrice::query()->count());
    }

    public function test_ca20_ticket_sales_effective_at_boundaries_and_non_existent_dates(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        $this->travelTo($this->at('2026-11-02 12:00:00'));
        $rows = TicketPrice::query()->count();
        $payload = fn (string $at) => ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'scheduled', 'effective_at' => $at];

        // Fechas inexistentes: se rechazan, no se desbordan al mes siguiente.
        foreach (['2026-02-31T10:00:00Z', '2027-02-29T10:00:00Z', '2026-13-01T10:00:00Z', '2026-04-31T10:00:00-06:00'] as $invalid) {
            $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', $payload($invalid))
                ->assertStatus(422)->assertJsonValidationErrors(['effective_at'], 'errors');
        }
        // Un segundo antes de ahora: rechazado; exactamente ahora: admitido.
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', $payload('2026-11-02T11:59:59Z'))->assertStatus(422);
        $this->assertSame($rows, TicketPrice::query()->count());
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', $payload('2026-11-02T12:00:00Z'))->assertCreated();
        // Límite exacto de un año: admitido; un segundo más, rechazado (CA-45).
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', $payload('2027-11-02T12:00:00Z'))->assertCreated();
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', $payload('2027-11-02T12:00:01Z'))->assertStatus(422);
        $this->assertSame($rows + 4, TicketPrice::query()->count());
    }

    public function test_ca21_ticket_sales_rejects_zero_negative_and_over_precise_amounts(): void
    {
        $admin = $this->createAccount('admin');
        $this->setPrices($admin);
        $rows = TicketPrice::query()->count();

        foreach ([0, -5, '0.00', 10.123, 'abc', null] as $bad) {
            $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
                'adult_amount' => $bad, 'child_amount' => 16, 'mode' => 'immediate',
            ])->assertStatus(422)->assertJsonValidationErrors(['adult_amount'], 'errors');
            $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', [
                'adult_amount' => 25, 'child_amount' => $bad, 'mode' => 'immediate',
            ])->assertStatus(422)->assertJsonValidationErrors(['child_amount'], 'errors');
        }
        $this->actAs($admin)->postJson('/api/v1/admin/ticket-prices', ['adult_amount' => 25, 'child_amount' => 16, 'mode' => 'otro'])
            ->assertStatus(422)->assertJsonValidationErrors(['mode'], 'errors');

        $this->assertSame($rows, TicketPrice::query()->count());
    }
}
