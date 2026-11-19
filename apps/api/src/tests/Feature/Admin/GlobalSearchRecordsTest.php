<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchRecordsTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** CA-27 enclosure-status-and-global-search */
    public function test_ca27_news_and_events_subtitle_active_or_inactive(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $newsOn = $this->makeNews('A '.$tag);
        $newsOff = $this->makeNews('B '.$tag, false);
        $newsDeleted = $this->makeNews('C '.$tag, true, true);
        $eventOn = $this->makeEvent('A '.$tag);
        $eventOff = $this->makeEvent('B '.$tag, false);
        $eventDeleted = $this->makeEvent('C '.$tag, true, true);

        $groups = $this->groupsBySection($this->search($admin, $tag));

        $this->assertSame([$newsOn, $newsOff], array_column($groups['news']['items'], 'id'));
        $this->assertSame(['Activa', 'Inactiva'], array_column($groups['news']['items'], 'subtitle'));
        $this->assertSame([$eventOn, $eventOff], array_column($groups['events']['items'], 'id'));
        $this->assertSame(['Activo', 'Inactivo'], array_column($groups['events']['items'], 'subtitle'));
        $this->assertNotContains($newsDeleted, array_column($groups['news']['items'], 'id'));
        $this->assertNotContains($eventDeleted, array_column($groups['events']['items'], 'id'));

        // Campos de CA-43: descripción, contenido, categoría y ubicación.
        $other = $this->tag();
        $byBody = $this->makeNews('Titular '.$this->tag(), true, false, ['description' => 'Resumen '.$other, 'content' => 'Texto '.$other, 'category' => 'Cat'.$other]);
        $byPlace = $this->makeEvent('Fiesta '.$this->tag(), true, false, ['description' => 'Detalle '.$other, 'location' => 'Plaza '.$other]);
        $news = collect($this->groupsBySection($this->search($admin, $other))['news']['items'])->keyBy('id');
        $this->assertSame('Descripción', $news[$byBody]['match']['field']);
        $events = collect($this->groupsBySection($this->search($admin, $other))['events']['items'])->keyBy('id');
        $this->assertSame('Descripción', $events[$byPlace]['match']['field']);
    }

    /** CA-28 enclosure-status-and-global-search */
    public function test_ca28_enclosures_group_active_and_inactive_not_deleted(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $on = $this->makeEnclosure(['name' => 'A '.$tag]);
        $off = $this->makeEnclosure(['name' => 'B '.$tag, 'is_active' => 0]);
        $gone = $this->makeEnclosure(['name' => 'C '.$tag]);
        $gone->delete();

        $items = $this->groupsBySection($this->search($admin, $tag))['enclosures']['items'];

        $this->assertSame([$on->id, $off->id], array_column($items, 'id'));
        $this->assertSame(['Activo', 'Inactivo'], array_column($items, 'subtitle'));

        // Tolerancia (enmienda (b)): sin acentos ni mayúsculas, prefijo y error de una letra.
        $lobos = $this->makeEnclosure(['name' => 'Recinto Lóbos '.$tag]);
        foreach (['RECINTO LOBOS', 'recint lobos', 'recinto lovos'] as $query) {
            $ids = array_column($this->groupsBySection($this->search($admin, $query))['enclosures']['items'] ?? [], 'id');
            $this->assertContains($lobos->id, $ids, $query);
        }
        // El nombre es el título: no lleva `match`.
        $this->assertArrayNotHasKey('match', $this->groupsBySection($this->search($admin, $tag))['enclosures']['items'][0]);
    }

    /** CA-29 enclosure-status-and-global-search */
    public function test_ca29_memory_by_id_status_opinion_and_rejection(): void
    {
        $zooAdmin = $this->createAccount('zoo-admin');
        $tag = $this->tag();
        $id = $this->makeMemory('in_review', false, 'Opinión de '.$tag);
        $rejected = $this->makeMemory('rejected', false, 'Texto', ['rejection_reason' => 'Motivo '.$tag.' sin foto']);
        $deleted = $this->makeMemory('accepted', true);

        // Por identificador exacto, sin el texto de la opinión si no coincide.
        $item = $this->groupsBySection($this->search($zooAdmin, (string) $id))['memories']['items'][0];
        $this->assertSame(['id' => $id, 'title' => 'Momento #'.$id, 'subtitle' => 'En revisión'], $item);

        // Por opinión y motivo de rechazo: `match` con el campo y el fragmento.
        $items = collect($this->groupsBySection($this->search($zooAdmin, $tag))['memories']['items'])->keyBy('id');
        $this->assertSame(['field' => 'Opinión', 'snippet' => 'Opinión de '.$tag], $items[$id]['match']);
        $this->assertSame(['field' => 'Motivo del rechazo', 'snippet' => 'Motivo '.$tag.' sin foto'], $items[$rejected]['match']);

        // Por estado en español.
        $byStatus = collect($this->groupsBySection($this->search($zooAdmin, $tag.' rechazado'))['memories']['items'])->keyBy('id');
        $this->assertSame([$rejected], $byStatus->keys()->all());
        $this->assertSame('Rechazado', $byStatus[$rejected]['subtitle']);

        $this->assertArrayNotHasKey('memories', $this->groupsBySection($this->search($zooAdmin, (string) $deleted)));
        // Sin memories.review no aparece el grupo.
        $this->assertArrayNotHasKey('memories', $this->groupsBySection($this->search($this->createAccount('admin'), (string) $id)));
    }

    /** CA-31 enclosure-status-and-global-search */
    public function test_ca31_ticket_by_folio_without_buyer_data(): void
    {
        $cashier = $this->createAccount('cashier');
        $done = $this->makeTicket('completed', '2026-11-15 12:00:00');
        $cancelled = $this->makeTicket('cancelled', '2026-11-16 12:00:00');
        $deleted = $this->makeTicket('completed', '2026-11-16 12:00:00', true);

        $response = $this->search($cashier, (string) $done)->assertOk();
        $this->assertSame(
            [['id' => $done, 'title' => 'Boleto #'.$done, 'subtitle' => 'Comprado el 15/11/2026 · Vigente']],
            $this->groupsBySection($response)['ticket-history']['items'],
        );
        $this->assertSame(
            'Comprado el 16/11/2026 · Cancelado',
            $this->groupsBySection($this->search($cashier, (string) $cancelled))['ticket-history']['items'][0]['subtitle'],
        );
        $this->assertArrayNotHasKey('ticket-history', $this->groupsBySection($this->search($cashier, (string) $deleted)));
        $this->assertArrayNotHasKey('ticket-history', $this->groupsBySection($this->search($cashier, $done.'x')));

        // Estado, forma de pago, motivo de cancelación y fecha (CA-43).
        $reasonTag = $this->tag();
        $paid = $this->makeTicket('cancelled', '2031-03-04 12:00:00', false, ['payment_method' => 'cash', 'cancellation_reason' => 'Error '.$reasonTag]);
        foreach ([$reasonTag => 'Motivo de cancelación', 'cancelado '.$reasonTag => 'Estado', '04/03/2031' => 'Fecha de compra', 'efectivo '.$reasonTag => 'Forma de pago'] as $query => $field) {
            $items = collect($this->groupsBySection($this->search($cashier, (string) $query))['ticket-history']['items'] ?? [])->keyBy('id');
            $this->assertTrue($items->has($paid), $query);
            $this->assertSame($field, $items[$paid]['match']['field'] ?? null, $query);
        }
    }
}
