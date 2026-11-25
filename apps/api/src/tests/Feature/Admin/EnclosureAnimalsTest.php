<?php

namespace Tests\Feature\Admin;

use App\Models\Animal;
use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureAnimalsTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;

    public function test_ca55_lists_only_assigned_animals_for_active_and_inactive_enclosures(): void
    {
        $this->actAs($this->createAccount('admin'));
        $active = $this->makeEnclosure();
        $inactive = $this->makeEnclosure(['is_active' => 0]);
        $empty = $this->makeEnclosure();
        $species = $this->makeSpeciesId();
        $activeAnimal = Animal::query()->findOrFail($this->makeAnimal($active, $species));
        $inactiveAnimal = Animal::query()->findOrFail($this->makeAnimal($inactive, $species, false));
        $inactiveAnimal->update(['name' => null, 'stay_status' => 'Cuarentena_Ingreso']);
        Animal::query()->findOrFail($this->makeAnimal($active, $species))->delete();

        foreach ([[$active, $activeAnimal], [$inactive, $inactiveAnimal]] as [$enclosure, $animal]) {
            $this->getJson(route('admin.enclosures.animals.index', $enclosure))
                ->assertOk()
                ->assertExactJson(['data' => [[
                    'id' => $animal->id,
                    'name' => $animal->name,
                    'species_name' => $animal->species->common_name,
                ]]]);
        }

        $this->getJson(route('admin.enclosures.animals.index', $empty))
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_ca56_requires_permission_and_returns_not_found_for_missing_enclosures(): void
    {
        $enclosure = $this->makeEnclosure();
        $url = route('admin.enclosures.animals.index', $enclosure);

        $this->getJson($url)->assertUnauthorized();
        $this->actAs($this->createAccount('cashier'))->getJson($url)->assertForbidden();

        $this->actAs($this->createAccount('admin'));
        $this->getJson(route('admin.enclosures.animals.index', 'missing'))->assertNotFound();
        $enclosure->delete();
        $this->getJson($url)->assertNotFound()->assertJsonPath('message', 'Recinto no encontrado.');
    }
}
