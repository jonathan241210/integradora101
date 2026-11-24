<?php

namespace Tests\Unit;

use App\Enums\PublishedSpeciesField;
use PHPUnit\Framework\TestCase;

class PublishedSpeciesFieldTest extends TestCase
{
    /** CA-01 species-fun-fact clave del campo */
    public function test_ca01_fun_fact_is_an_accepted_published_field(): void
    {
        $this->assertSame('fun_fact', PublishedSpeciesField::FunFact->value);
        $this->assertContains('fun_fact', PublishedSpeciesField::implementedValues());
        // The default selection (api-014 RN-13) does not change.
        $this->assertSame(['scientific_name', 'origin', 'habitat'], PublishedSpeciesField::defaults());
    }
}
