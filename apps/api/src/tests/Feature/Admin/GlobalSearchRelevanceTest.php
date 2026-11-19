<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

/** Enmienda 2026-11-18 (d): relevancia de la búsqueda global. */
class GlobalSearchRelevanceTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** @return list<int> */
    private function newsIds($admin, string $q): array
    {
        return array_column($this->groupsBySection($this->search($admin, $q))['news']['items'] ?? [], 'id');
    }

    /** CA-50 enclosure-status-and-global-search */
    public function test_ca50_literal_title_first(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        // Creados en orden inverso al esperado.
        $mobile = $this->makeNews("Noticia para prueba de móvil nuevo {$tag}");
        $short = $this->makeNews("Noticia de prueba {$tag}");
        $literal = $this->makeNews("Noticia de prueba nuevo {$tag}");

        $ids = $this->newsIds($admin, "noticia de prueba nuevo {$tag}");

        $this->assertSame($literal, $ids[0]);
        $this->assertContains($short, $ids);
        $this->assertContains($mobile, $ids);
        $this->assertLessThan(array_search($mobile, $ids, true), array_search($literal, $ids, true));
    }

    /** CA-51 enclosure-status-and-global-search */
    public function test_ca51_contiguous_phrase_before_loose_words(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $loose = $this->makeNews("Zorro rojo grande {$tag}");
        $inside = $this->makeNews("Un gran zorro rojo {$tag} aquí");
        $start = $this->makeNews("Zorro rojo {$tag} del norte");

        $ids = $this->newsIds($admin, "zorro rojo {$tag}");

        // La frase al inicio del título, después la frase en medio y al final las palabras sueltas.
        $this->assertSame([$start, $inside, $loose], $ids);
        $phrase = $this->makeNews("Lince ibérico {$tag}");
        $apart = $this->makeNews("Ibérico lince {$tag}");
        $order = $this->newsIds($admin, "lince ibérico {$tag}");
        $this->assertLessThan(array_search($apart, $order, true), array_search($phrase, $order, true));
    }

    /** CA-52 enclosure-status-and-global-search */
    public function test_ca52_phrase_in_other_field(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $loose = $this->makeNews("Aaa {$tag}", true, false, ['description' => "rio {$tag} ancho y caudaloso"]);
        $phrase = $this->makeNews("Zzz {$tag}", true, false, ['description' => "cruza el rio ancho {$tag} de la sierra"]);
        $title = $this->makeNews("Zzy rio ancho {$tag}");

        $ids = $this->newsIds($admin, "rio ancho {$tag}");

        $this->assertSame([$title, $phrase, $loose], $ids);
    }

    /** CA-37 enclosure-status-and-global-search */
    public function test_ca37_partial_words_after_complete(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $partial = $this->makeNews("Aaa alfa bravo charlie {$tag}");
        $complete = $this->makeNews("Zzz alfa bravo charlie delta {$tag}");

        // 4 palabras (alfa bravo charlie delta): coincidir 3 de 4 basta; completas primero.
        $ids = $this->newsIds($admin, 'alfa bravo charlie delta');
        $this->assertContains($partial, $ids);
        $this->assertLessThan(array_search($partial, $ids, true), array_search($complete, $ids, true));

        // 4 palabras donde coincide la mitad (2): también entra; con una sola, no.
        $half = $this->makeNews("Mmm alfa bravo {$tag}");
        $this->assertContains($half, $this->newsIds($admin, 'alfa bravo xxxxx yyyyy '.$tag));
        $this->assertNotContains($half, $this->newsIds($admin, 'alfa qqqqq xxxxx yyyyy zzzzz'));
    }

    /** CA-53 enclosure-status-and-global-search */
    public function test_ca53_words_and_levels_two_words_require_both(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $both = $this->makeNews("Panda gigante {$tag}");
        $one = $this->makeNews("Panda {$tag} solo");

        // Con 2 palabras se exigen ambas.
        $ids = $this->newsIds($admin, 'panda gigante');
        $this->assertContains($both, $ids);
        $this->assertNotContains($one, $ids);

        // Con 3 palabras basta ceil(3/2) = 2, pero primero van las que coinciden con más palabras y mayores niveles.
        $exact = $this->makeNews("Koala azul {$tag} extra");
        $prefix = $this->makeNews("Koalas azul {$tag} extra");
        $fewer = $this->makeNews("Koala {$tag} extra");
        $ids = $this->newsIds($admin, "koala azul {$tag}");
        $this->assertSame([$exact, $prefix], array_slice($ids, 0, 2));
        $this->assertNotContains($fewer, array_slice($ids, 0, 2));
    }

    /** CA-54 enclosure-status-and-global-search */
    public function test_ca54_group_best_score(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $this->makeNews("Nutria gris {$tag}");
        $this->makeEnclosure(['name' => "Nutria {$tag}"]);

        $groups = $this->groupsBySection($this->search($admin, "nutria gris {$tag}"));
        $news = $groups['news']['best_score'];
        $this->assertIsInt($news);
        // A=1 (título literal), B=2 (la frase empieza el título), C=0, DD=03, EEE=012, F=4.
        $this->assertSame(120_030_124, $news);

        $second = $this->groupsBySection($this->search($admin, "nutria {$tag}"));
        $this->assertSame(120_020_084, $second['enclosures']['best_score']);
        $this->assertGreaterThan($second['enclosures']['best_score'], $news);
    }
}
