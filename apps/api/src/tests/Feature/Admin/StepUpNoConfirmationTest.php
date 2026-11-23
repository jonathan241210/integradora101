<?php

namespace Tests\Feature\Admin;

use App\Models\EnclosureQrCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\ConfirmsStepUp;

class StepUpNoConfirmationTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures, ConfirmsStepUp;

    /** CA-21 staff-step-up-confirmation */
    public function test_ca21_selling_and_quoting_do_not_ask_for_password(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->seedPrices($cashier);

        $this->notStepUp($this->actAsWithoutWindow($cashier)->postJson('/api/v1/admin/tickets/quote', ['adult_quantity' => 1, 'child_quantity' => 1]))
            ->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($cashier)->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 1]))
            ->assertCreated();
    }

    /** CA-22 staff-step-up-confirmation */
    public function test_ca22_exporting_a_report_does_not_ask_for_password(): void
    {
        $admin = $this->createAccount('admin');

        $this->notStepUp($this->actAsWithoutWindow($admin)->get('/api/v1/admin/reports/tickets/export?period=week&date=2026-11-04&format=csv'))
            ->assertOk();
    }

    /** CA-23 staff-step-up-confirmation */
    public function test_ca23_news_and_events_do_not_ask_for_password(): void
    {
        $admin = $this->createAccount('admin');
        $news = ['title' => 'Noticia '.bin2hex(random_bytes(3)), 'description' => 'Resumen', 'content' => 'Contenido de la noticia.',
            'category' => 'Institucional', 'published_date' => '2026-10-30', 'start_date' => '2026-10-30', 'end_date' => '2026-11-30'];
        $event = ['name' => 'Evento '.bin2hex(random_bytes(3)), 'description' => 'Descripción', 'location' => 'Plaza',
            'start_date' => '2099-05-01', 'end_date' => '2099-05-02'];

        $id = $this->notStepUp($this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/news', $news))->assertCreated()->json('data.id');
        $this->notStepUp($this->actAsWithoutWindow($admin)->patchJson("/api/v1/admin/news/{$id}", $news))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($admin)->patchJson("/api/v1/admin/news/{$id}/status", ['is_active' => false]))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($admin)->deleteJson("/api/v1/admin/news/{$id}"))->assertSuccessful();

        $id = $this->notStepUp($this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/events', $event))->assertCreated()->json('data.id');
        $this->notStepUp($this->actAsWithoutWindow($admin)->patchJson("/api/v1/admin/events/{$id}", $event))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($admin)->patchJson("/api/v1/admin/events/{$id}/status", ['is_active' => false]))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($admin)->deleteJson("/api/v1/admin/events/{$id}"))->assertSuccessful();
    }

    /** CA-24 staff-step-up-confirmation */
    public function test_ca24_memories_and_species_do_not_ask_for_password(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $missing = 999999999;

        foreach ([
            ['postJson', "/api/v1/admin/memories/{$missing}/accept"],
            ['postJson', "/api/v1/admin/memories/{$missing}/reject"],
            ['patchJson', "/api/v1/admin/species-publication-requests/{$missing}"],
            ['postJson', "/api/v1/admin/species-publication-requests/{$missing}/accept"],
            ['postJson', "/api/v1/admin/species-publication-requests/{$missing}/reject"],
            ['postJson', "/api/v1/admin/species/{$missing}/unpublish"],
            ['postJson', "/api/v1/admin/species/{$missing}/republish"],
            ['patchJson', "/api/v1/admin/species/{$missing}/publication"],
            ['deleteJson', "/api/v1/admin/species/{$missing}/publication"],
        ] as [$method, $url]) {
            $response = $this->actAsWithoutWindow($zooAdmin)->{$method}($url);
            $this->notStepUp($response);
            $this->assertNotSame(403, $response->status(), "{$method} {$url}");
        }
    }

    /** CA-25 staff-step-up-confirmation */
    public function test_ca25_veterinarian_in_pwa_needs_no_2fa_or_password(): void
    {
        $vet = $this->createAccount('veterinarian', false);

        $this->notStepUp($this->actAsWithoutWindow($vet)->getJson('/api/v1/veterinarian/species'))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($vet)->getJson('/api/v1/veterinarian/species-publication-requests'))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($vet)->getJson('/api/v1/staff/animals'))->assertOk();
        $response = $this->actAsWithoutWindow($vet)->postJson('/api/v1/staff/clinical-evaluations', []);
        $this->notStepUp($response);
        $this->assertSame(422, $response->status());
    }

    /** CA-26 staff-step-up-confirmation */
    public function test_ca26_admin_reads_do_not_ask_for_password(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');

        foreach (['/api/v1/admin/users', '/api/v1/admin/dashboard', '/api/v1/admin/news', '/api/v1/admin/events', '/api/v1/admin/enclosures', '/api/v1/admin/reports/tickets?period=week&date=2026-11-04', '/api/v1/admin/ticket-prices/current'] as $url) {
            $this->notStepUp($this->actAsWithoutWindow($admin)->getJson($url))->assertOk();
        }
        $this->notStepUp($this->actAsWithoutWindow($cashier)->getJson('/api/v1/admin/tickets'))->assertOk();
    }

    /** CA-34 staff-step-up-confirmation */
    public function test_ca34_first_qr_generation_does_not_ask_for_password(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $this->notStepUp($this->actAsWithoutWindow($admin)->postJson("/api/v1/admin/enclosures/{$enclosure->id}/qr"))->assertCreated();
        $this->assertSame(1, EnclosureQrCode::query()->where('enclosure_id', $enclosure->id)->where('is_active', true)->count());

        // Con ventana vigente tampoco la necesita ni la consume.
        $other = $this->makeEnclosure();
        $this->notStepUp($this->actAsConfirmed($admin)->postJson("/api/v1/admin/enclosures/{$other->id}/qr"))->assertCreated();
    }

    /** CA-39 staff-step-up-confirmation */
    public function test_ca39_regenerating_qr_without_code_does_not_ask_for_password(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();

        $this->notStepUp($this->actAsWithoutWindow($admin)->postJson("/api/v1/admin/enclosures/{$enclosure->id}/qr/regenerate"))->assertOk();
        $this->assertSame(1, EnclosureQrCode::query()->where('enclosure_id', $enclosure->id)->where('is_active', true)->count());

        // Ahora sí tiene QR activo: pide ventana (CA-20).
        $this->actAsWithoutWindow($admin)->postJson("/api/v1/admin/enclosures/{$enclosure->id}/qr/regenerate")
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required')->assertJsonPath('mode', 'window');
    }

    /** CA-40 staff-step-up-confirmation */
    public function test_ca40_enclosure_create_edit_and_status_do_not_ask_for_password(): void
    {
        $admin = $this->createAccount('admin');
        $name = 'Recinto '.bin2hex(random_bytes(4));

        $id = $this->notStepUp($this->actAsWithoutWindow($admin)->postJson('/api/v1/admin/enclosures', ['name' => $name]))
            ->assertCreated()->json('data.id');
        $this->notStepUp($this->actAsWithoutWindow($admin)->patchJson("/api/v1/admin/enclosures/{$id}", ['name' => $name.' editado']))->assertOk();
        $this->notStepUp($this->actAsWithoutWindow($admin)->patchJson("/api/v1/admin/enclosures/{$id}/status", ['is_active' => false]))->assertOk();
        $this->assertNull(DB::table('enclosures')->where('id', $id)->value('deleted_at'));
    }

    /** Ni el 403 de contraseña ni el de 2FA: la operación se resuelve por su propia regla. */
    private function notStepUp(TestResponse $response): TestResponse
    {
        if (str_contains((string) $response->headers->get('content-type'), 'json')) {
            $this->assertNotContains($response->json('code'), ['password_confirmation_required', 'two_factor_setup_required']);
        }

        return $response;
    }

    private function seedPrices(User $creator): void
    {
        DB::table('ticket_prices')->delete();
        foreach (['adult' => '25.00', 'child' => '16.00'] as $type => $amount) {
            DB::table('ticket_prices')->insert([
                'ticket_type' => $type, 'amount' => $amount, 'effective_at' => '2020-01-01 00:00:00',
                'created_by' => $creator->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}
