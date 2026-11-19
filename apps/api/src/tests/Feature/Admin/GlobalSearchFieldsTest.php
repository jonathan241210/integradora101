<?php

namespace Tests\Feature\Admin;

use App\Models\Department;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchFieldsTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** @return list<int> */
    private function ids($user, string $q, string $section): array
    {
        return array_column($this->groupsBySection($this->search($user, $q))[$section]['items'] ?? [], 'id');
    }

    /** CA-43 enclosure-status-and-global-search */
    public function test_ca43_users_department_and_role(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $areaTag = $this->tag();
        $codeTag = $this->tag();
        $department = Department::create(['name' => 'Sector '.$areaTag, 'code' => $codeTag, 'description' => null, 'is_active' => true]);
        $user = $this->createAccount('veterinarian', true, ['department_id' => $department->id, 'first_name' => 'Vera'.$tag]);

        $this->assertContains($user->id, $this->ids($admin, 'sector '.$areaTag, 'users'));
        $this->assertContains($user->id, $this->ids($admin, $tag.' veterinario', 'users'));
        $this->assertContains($user->id, $this->ids($admin, $tag.' VETERINARIAN', 'users'));
        $this->assertNotContains($user->id, $this->ids($admin, $tag.' cajero', 'users'));
        // El código del área no es un campo buscable.
        $this->assertNotContains($user->id, $this->ids($admin, $codeTag, 'users'));
    }

    /** CA-43 enclosure-status-and-global-search */
    public function test_ca43_news_events_fields(): void
    {
        $admin = $this->searchAdmin();
        $t = [$this->tag(), $this->tag(), $this->tag(), $this->tag(), $this->tag()];
        $news = $this->makeNews('Noticia '.$this->tag(), true, false, ['description' => 'D '.$t[0], 'content' => 'C '.$t[1], 'category' => 'K'.$t[2], 'image_path' => 'img/'.$t[3].'.jpg']);
        $event = $this->makeEvent('Evento '.$this->tag(), true, false, ['description' => 'D '.$t[0], 'location' => 'L '.$t[4], 'image_path' => 'img/'.$t[3].'.jpg']);

        foreach ([[$t[0], 'Descripción'], [$t[1], 'Contenido'], [$t[2], 'Categoría']] as [$word, $field]) {
            $items = collect($this->groupsBySection($this->search($admin, $word))['news']['items'])->keyBy('id');
            $this->assertSame($field, $items[$news]['match']['field'], $field);
        }
        $items = collect($this->groupsBySection($this->search($admin, $t[4]))['events']['items'])->keyBy('id');
        $this->assertSame('Ubicación', $items[$event]['match']['field']);
        // Fuera de la lista (ruta de imagen) no se busca.
        $groups = $this->groupsBySection($this->search($admin, $t[3]));
        $this->assertArrayNotHasKey('news', $groups);
        $this->assertArrayNotHasKey('events', $groups);
    }

    /** CA-43 enclosure-status-and-global-search */
    public function test_ca43_tulanpedia_species_fields(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $t = [$this->tag(), $this->tag(), $this->tag(), $this->tag(), $this->tag(), $this->tag()];
        $id = $this->makeSpeciesId([
            'common_name' => 'Especie '.$this->tag(), 'is_published' => 1,
            'scientific_name' => 'Sci '.$t[0], 'category' => 'Cat '.$t[1], 'habitat' => 'Hab '.$t[2],
            'distribution' => 'Dis '.$t[3], 'conservation_status' => 'Con '.$t[4], 'feeding' => 'Alimento '.$t[5],
        ]);

        $fields = ['Nombre científico', 'Categoría', 'Hábitat', 'Distribución', 'Estado de conservación'];
        foreach ($fields as $index => $field) {
            $item = collect($this->groupsBySection($this->search($zooAdmin, $t[$index]))['tulanpedia']['items'])->firstWhere('id', $id);
            $this->assertSame($field, $item['match']['field'], $field);
        }
        // La alimentación no es un campo buscable.
        $this->assertArrayNotHasKey('tulanpedia', $this->groupsBySection($this->search($zooAdmin, $t[5])));
    }

    /** CA-43 enclosure-status-and-global-search */
    public function test_ca43_ticket_status_method_reason_date(): void
    {
        $cashier = $this->createAccount('cashier');
        $reason = $this->tag();
        $id = $this->makeTicket('cancelled', '2032-07-09 15:30:00', false, ['payment_method' => 'cash', 'cancellation_reason' => 'Error '.$reason]);
        $done = $this->makeTicket('completed', '2032-07-09 15:30:00');
        $field = fn (string $q, int $ticket) => collect($this->groupsBySection($this->search($cashier, $q))['ticket-history']['items'] ?? [])->firstWhere('id', $ticket)['match']['field'] ?? null;

        $this->assertSame('Motivo de cancelación', $field($reason, $id));
        $this->assertSame('Estado', $field('cancelado '.$reason, $id));
        $this->assertSame('Forma de pago', $field('efectivo '.$reason, $id));
        $this->assertSame('Fecha de compra', $field('09/07/2032', $done));
        $this->assertSame('Estado', $field('completado 09/07/2032', $done));
        $this->assertSame('Estado', $field('vigente 09/07/2032', $done));
        // Folio exacto y no por prefijo.
        $this->assertContains($id, $this->ids($cashier, (string) $id, 'ticket-history'));
    }

    /** CA-44 enclosure-status-and-global-search */
    public function test_ca44_memory_never_exposes_visitor_data(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $tag = $this->tag();
        $visitor = DB::table('visitors')->insertGetId([
            'nickname' => 'nick'.$tag, 'email' => $tag.'@visitante.arca.invalid', 'first_name' => 'Nom'.$tag,
            'avatar_code' => 'avatar-1', 'adult_confirmed_at' => now(), 'privacy_notice_version' => '2026-10',
            'privacy_accepted_at' => now(), 'password' => 'x', 'is_active' => 1, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $memory = $this->makeMemory('in_review', false, 'Opinión sin nombres', ['visitor_id' => $visitor]);

        $sql = [];
        DB::listen(function ($query) use (&$sql): void {
            $sql[] = strtolower($query->sql);
        });
        $response = $this->search($zooAdmin, $tag)->assertOk();
        $this->assertArrayNotHasKey('memories', $this->groupsBySection($response));
        $this->assertStringNotContainsString($tag, $response->getContent());

        $found = $this->search($zooAdmin, 'sin nombres')->assertOk();
        $item = collect($this->groupsBySection($found)['memories']['items'])->firstWhere('id', $memory);
        $this->assertSame('Opinión', $item['match']['field']);
        $this->assertStringNotContainsString($tag, $found->getContent());
        foreach ($sql as $query) {
            if (str_contains($query, 'visitor_memories')) {
                $this->assertStringNotContainsString('visitor_id', $query);
                $this->assertStringNotContainsString('visitors', $query);
            }
        }
    }

    /** CA-45 enclosure-status-and-global-search */
    public function test_ca45_ticket_buyer_data_not_searched(): void
    {
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Cajera'.$this->tag()]);
        $buyerTag = $this->tag();
        $id = $this->makeTicket('completed', '2032-07-09 15:30:00', false, ['cashier_id' => $cashier->id, 'qr_code' => 'QR-'.$buyerTag]);

        $sql = [];
        DB::listen(function ($query) use (&$sql): void {
            $sql[] = strtolower($query->sql);
        });
        // Ni el cajero ni el código QR del boleto sirven para encontrarlo.
        $this->assertSame([], $this->ids($cashier, $cashier->first_name, 'ticket-history'));
        $this->assertSame([], $this->ids($cashier, $buyerTag, 'ticket-history'));
        $this->assertSame([], $this->ids($cashier, $cashier->email, 'ticket-history'));
        $this->assertContains($id, $this->ids($cashier, (string) $id, 'ticket-history'));
        foreach ($sql as $query) {
            if (str_contains($query, 'from `tickets`')) {
                $this->assertStringNotContainsString('qr_code', $query);
                $this->assertStringNotContainsString('cashier_id', $query);
                $this->assertStringNotContainsString('*', $query);
            }
        }
    }
}
