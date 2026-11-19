<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchResultsTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** CA-23 enclosure-status-and-global-search */
    public function test_ca23_response_shape_and_group_order(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $this->createAccount('executive', true, ['first_name' => $tag]);
        $this->makeNews('Noticia '.$tag, true, false, ['description' => 'Resumen '.$tag]);
        $this->makeEvent('Evento '.$tag);
        $this->makeEnclosure(['name' => 'Recinto '.$tag]);
        $this->makeSpeciesId(['common_name' => 'Especie '.$tag, 'is_published' => 1]);

        $groups = $this->search($admin, $tag)->assertOk()->json('groups');

        $this->assertSame(['users', 'news', 'events', 'enclosures', 'tulanpedia'], array_column($groups, 'section'));
        $news = collect($groups)->firstWhere('section', 'news')['items'][0];
        $this->assertSame(['field' => 'Descripción', 'snippet' => 'Resumen '.$tag], $news['match']);
        $this->assertSame(['Usuarios', 'Noticias', 'Eventos', 'Recintos', 'TulanPedia'], array_column($groups, 'label'));
        foreach ($groups as $group) {
            $this->assertSame(['section', 'label', 'best_score', 'items'], array_keys($group));
            foreach ($group['items'] as $item) {
                // `kind` solo en tulanpedia; `match` es opcional y va al final (CA-42).
                $expected = $group['section'] === 'tulanpedia' ? ['id', 'title', 'subtitle', 'kind'] : ['id', 'title', 'subtitle'];
                $keys = array_keys($item);
                if (isset($item['match'])) {
                    $this->assertSame('match', array_pop($keys));
                    $this->assertSame(['field', 'snippet'], array_keys($item['match']));
                }
                $this->assertSame($expected, $keys);
                $this->assertIsInt($item['id']);
            }
        }
    }

    /** CA-24 enclosure-status-and-global-search */
    public function test_ca24_limit_five_sorted_by_score_title_id(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $first = $this->makeNews('B '.$tag);
        $second = $this->makeNews('B '.$tag);
        $this->makeNews('E '.$tag);
        $this->makeNews('D '.$tag);
        $this->makeNews('C '.$tag);
        $this->makeNews('A '.$tag);
        $this->makeNews('F '.$tag);

        $items = $this->groupsBySection($this->search($admin, $tag))['news']['items'];

        $this->assertCount(5, $items);
        $this->assertSame(['A '.$tag, 'B '.$tag, 'B '.$tag, 'C '.$tag, 'D '.$tag], array_column($items, 'title'));
        $this->assertSame([$first, $second], [$items[1]['id'], $items[2]['id']]);
    }

    /** CA-25 enclosure-status-and-global-search */
    public function test_ca25_groups_follow_permissions(): void
    {
        $tag = $this->tag();
        $this->createAccount('executive', true, ['first_name' => $tag]);
        $this->makeNews('Noticia '.$tag);
        $this->makeEnclosure(['name' => 'Recinto '.$tag]);
        $ticket = $this->makeTicket();

        $cashier = $this->createAccount('cashier');
        $this->search($cashier, $tag)->assertOk()->assertExactJson(['groups' => []]);
        $this->assertSame(['ticket-history'], array_column($this->search($cashier, (string) $ticket)->json('groups'), 'section'));

        // Sin users.manage nunca aparece `users`, aunque coincida con una cuenta.
        $zooAdmin = $this->createAccount('zoo-admin');
        $sections = array_column($this->search($zooAdmin, $tag)->assertOk()->json('groups'), 'section');
        $this->assertSame(['news', 'enclosures'], $sections);
        $this->assertNotContains('users', $sections);
    }

    /** CA-32 enclosure-status-and-global-search */
    public function test_ca32_wildcards_are_literal(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $literal = $this->makeNews("{$tag}a%b");
        $this->makeNews("{$tag}aXb");
        $under = $this->makeNews("{$tag}c_d");
        $this->makeNews("{$tag}cZd");

        $items = $this->groupsBySection($this->search($admin, "{$tag}a%b"))['news']['items'];
        $this->assertSame([$literal], array_column($items, 'id'));
        $items = $this->groupsBySection($this->search($admin, "{$tag}c_d"))['news']['items'];
        $this->assertSame([$under], array_column($items, 'id'));

        $this->assertArrayNotHasKey('news', $this->groupsBySection($this->search($admin, '%%')));
        $this->assertArrayNotHasKey('news', $this->groupsBySection($this->search($admin, '__')));
    }
}
