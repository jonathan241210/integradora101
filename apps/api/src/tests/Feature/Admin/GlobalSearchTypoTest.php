<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchTypoTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    private function finds(string $name, string $word): bool
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $id = $this->makeEnclosure(['name' => $name.' '.$tag])->id;
        $items = $this->groupsBySection($this->search($admin, $word.' '.$tag))['enclosures']['items'] ?? [];

        return in_array($id, array_column($items, 'id'), true);
    }

    /** CA-38 enclosure-status-and-global-search */
    public function test_ca38_prefix_matches(): void
    {
        $this->assertTrue($this->finds('Elefante', 'elef'));
        $this->assertTrue($this->finds('Elefante', 'el'));
        $this->assertFalse($this->finds('Elefante', 'efan'.'x'));
    }

    /** CA-39 enclosure-status-and-global-search */
    public function test_ca39_typo_thresholds_by_length(): void
    {
        // 4 a 6 letras: una edición.
        $this->assertTrue($this->finds('Lobo', 'lovo'));
        $this->assertTrue($this->finds('Jirafa', 'jrafa'));
        $this->assertFalse($this->finds('Lobo', 'lvvo'));
        $this->assertFalse($this->finds('Jirafa', 'jirfxa'));
        // 7 o más letras: hasta dos ediciones.
        $this->assertTrue($this->finds('Elefante', 'elefnte'));
        $this->assertTrue($this->finds('Elefante', 'elefnnt'));
        $this->assertFalse($this->finds('Elefante', 'elfnnte'.'xx'));
        // Menos de 4 letras: sin errores.
        $this->assertFalse($this->finds('Oso', 'osa'));
        $this->assertTrue($this->finds('Oso', 'oso'));
    }

    /** CA-40 enclosure-status-and-global-search */
    public function test_ca40_contains_needs_four_letters(): void
    {
        $this->assertFalse($this->finds('Lobos', 'os'));
        $this->assertFalse($this->finds('Lobos', 'obo'));
        $this->assertTrue($this->finds('Lobos', 'obos'));
        $this->assertTrue($this->finds('Pelobo', 'lobo'));
    }
}
