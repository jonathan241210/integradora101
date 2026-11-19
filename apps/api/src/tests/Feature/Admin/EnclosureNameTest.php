<?php

namespace Tests\Feature\Admin;

use Tests\Concerns\BuildsEnclosureFixtures;

class EnclosureNameTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;

    /** CA-11 enclosure-status-and-global-search */
    public function test_ca11_unique_name_only_among_not_deleted(): void
    {
        $admin = $this->createAccount('admin');
        $name = 'Unico '.bin2hex(random_bytes(4));
        $deleted = $this->makeEnclosure(['name' => $name]);
        $deleted->delete();

        $this->actAs($admin)->postJson('/api/v1/admin/enclosures', ['name' => $name])->assertCreated();

        $other = 'Inactivo '.bin2hex(random_bytes(4));
        $this->makeEnclosure(['name' => $other, 'is_active' => 0]);
        $this->actAs($admin)->postJson('/api/v1/admin/enclosures', ['name' => $other])
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'Ya existe un recinto con ese nombre.');

        $third = $this->makeEnclosure();
        $this->actAs($admin)->patchJson("/api/v1/admin/enclosures/{$third->id}", ['name' => $other])
            ->assertUnprocessable()->assertJsonPath('errors.name.0', 'Ya existe un recinto con ese nombre.');
    }
}
