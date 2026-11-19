<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchNormalizationTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** @return list<int> */
    private function enclosureIds($admin, string $q): array
    {
        return array_column($this->groupsBySection($this->search($admin, $q))['enclosures']['items'] ?? [], 'id');
    }

    /** CA-36 enclosure-status-and-global-search */
    public function test_ca36_ignores_case_and_accents(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $accented = $this->makeEnclosure(['name' => 'Elefante '.$tag])->id;
        $plain = $this->makeEnclosure(['name' => 'Camión niño '.$tag])->id;

        foreach (['ÉLEFANTE', 'élefánte', 'elefante', 'ELEFANTE'] as $word) {
            $this->assertContains($accented, $this->enclosureIds($admin, $word.' '.$tag), $word);
        }
        // Tabla fija: á é í ó ú ü ñ.
        foreach (['CAMIÓN NIÑO', 'camion nino', 'camión niño'] as $query) {
            $this->assertContains($plain, $this->enclosureIds($admin, $query.' '.$tag), $query);
        }
        $this->assertSame([$this->makeEnclosure(['name' => 'Pingüino '.$tag])->id], $this->enclosureIds($admin, 'PINGUINO '.$tag));
    }

    /** CA-37 enclosure-status-and-global-search */
    public function test_ca37_all_words_any_order_across_fields(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $user = $this->createAccount('executive', true, ['first_name' => 'Juan', 'last_name' => 'López', 'second_last_name' => 'Pérez '.$tag]);
        $users = fn (string $q) => array_column($this->groupsBySection($this->search($admin, $q))['users']['items'] ?? [], 'id');

        $this->assertContains($user->id, $users('lopez juan '.$tag));
        $this->assertContains($user->id, $users($tag.' PEREZ lopez JUAN'));
        $this->assertNotContains($user->id, $users('juan zebra'));
        // Con 3 palabras basta que coincidan 2 (enmienda (d)); con 2 palabras se exigen ambas.
        $this->assertContains($user->id, $users('juan zebra '.$tag));

        // Palabras en campos distintos del mismo elemento (título y descripción).
        $news = $this->makeNews('Jirafa '.$tag, true, false, ['description' => 'Sabana africana']);
        $ids = fn (string $q) => array_column($this->groupsBySection($this->search($admin, $q))['news']['items'] ?? [], 'id');
        $this->assertContains($news, $ids('sabana jirafa '.$tag));
        $this->assertContains($news, $ids('africana '.$tag.' sabana'));
        $this->assertNotContains($news, $ids('sabana leon'));
    }
}
