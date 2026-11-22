<?php

namespace Tests\Unit;

use App\Support\FunFactRules;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class FunFactRulesTest extends TestCase
{
    /** CA-03 species-fun-fact máximo y texto plano (límites 19, 20, 500 y 501 caracteres) */
    public function test_ca03_max_500_plain_text_trimmed(): void
    {
        $fields = ['fun_fact'];

        $this->assertSame(str_repeat('a', 20), FunFactRules::resolve('  '.str_repeat('a', 20).' ', $fields));
        $this->assertSame(str_repeat('á', 500), FunFactRules::resolve(str_repeat('á', 500), $fields));
        $this->assertSame('<b>'.str_repeat('a', 20).'</b>', FunFactRules::resolve('<b>'.str_repeat('a', 20).'</b>', $fields));

        foreach ([str_repeat('a', 19), '', null] as $bad) {
            try {
                FunFactRules::resolve($bad, $fields);
                $this->fail('Expected a validation error.');
            } catch (ValidationException $e) {
                $this->assertSame([FunFactRules::MIN_MESSAGE], $e->errors()['fun_fact']);
            }
        }

        try {
            FunFactRules::resolve(str_repeat('a', 501), $fields);
            $this->fail('Expected a validation error.');
        } catch (ValidationException $e) {
            $this->assertSame([FunFactRules::MAX_MESSAGE], $e->errors()['fun_fact']);
        }

        $this->assertNull(FunFactRules::resolve('texto cualquiera', ['habitat']));
    }
}
