<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchMatchTest extends AdminFeatureTestCase
{
    use BuildsSearchFixtures;

    /** CA-42 enclosure-status-and-global-search */
    public function test_ca42_match_field_and_snippet_up_to_120(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $long = str_repeat('Palabra de relleno. ', 20).'Aquí aparece '.$tag.' en medio. '.str_repeat('Más relleno final. ', 20);
        $middle = $this->makeNews('Titular '.$this->tag(), true, false, ['content' => $long]);
        $start = $this->makeNews('Otro '.$this->tag(), true, false, ['content' => $tag.' '.str_repeat('inicio largo ', 30)]);
        $short = $this->makeNews('Breve '.$this->tag(), true, false, ['description' => "Dos\nlíneas ".$tag]);
        $titleOnly = $this->makeNews('Solo '.$tag.' título', true, false, ['content' => 'Nada', 'category' => 'General']);

        $items = collect($this->groupsBySection($this->search($admin, $tag))['news']['items'])->keyBy('id');

        $snippet = $items[$middle]['match']['snippet'];
        $this->assertSame('Contenido', $items[$middle]['match']['field']);
        $this->assertLessThanOrEqual(120, mb_strlen($snippet));
        $this->assertStringContainsString($tag, $snippet);
        $this->assertStringStartsWith('…', $snippet);
        $this->assertStringEndsWith('…', $snippet);
        $this->assertStringContainsString($tag, $items[$start]['match']['snippet']);
        $this->assertStringStartsNotWith('…', $items[$start]['match']['snippet']);
        $this->assertStringEndsWith('…', $items[$start]['match']['snippet']);
        $this->assertLessThanOrEqual(120, mb_strlen($items[$start]['match']['snippet']));
        // Texto corto: completo y con los espacios colapsados.
        $this->assertSame(['field' => 'Descripción', 'snippet' => 'Dos líneas '.$tag], $items[$short]['match']);
        // La coincidencia solo en el título no lleva `match`.
        $this->assertArrayNotHasKey('match', $items[$titleOnly]);
    }
}
