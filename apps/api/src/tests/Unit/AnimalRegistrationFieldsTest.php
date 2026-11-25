<?php

namespace Tests\Unit;

use App\Rules\AnimalRegistrationFields;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\Translator;
use Illuminate\Validation\Factory;
use PHPUnit\Framework\TestCase;

class AnimalRegistrationFieldsTest extends TestCase
{
    private function validationFactory(): Factory
    {
        return new Factory(new Translator(new ArrayLoader, 'es'));
    }

    public function test_ca02_accepts_binary_values_from_multipart(): void
    {
        foreach (['0', '1'] as $value) {
            $validated = $this->validationFactory()->make([
                'can_receive_visits' => $value,
            ], AnimalRegistrationFields::rules())->validate();

            $this->assertSame([
                'can_receive_visits' => (int) $value,
            ], AnimalRegistrationFields::attributes($validated));
        }
    }

    public function test_ca04_rejects_out_of_range_visits(): void
    {
        $validator = $this->validationFactory()->make([
            'can_receive_visits' => 2,
        ], AnimalRegistrationFields::rules());

        $this->assertTrue($validator->errors()->has('can_receive_visits'));
    }

    public function test_ca05_preserves_legacy_defaults_when_fields_are_omitted(): void
    {
        $validated = $this->validationFactory()->make([], AnimalRegistrationFields::rules())->validate();

        $this->assertSame([], AnimalRegistrationFields::attributes($validated));
    }
}
