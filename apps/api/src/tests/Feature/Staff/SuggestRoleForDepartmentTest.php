<?php

namespace Tests\Feature\Staff;

use App\Actions\Staff\SuggestRoleForDepartmentAction;
use App\Models\Department;
use Tests\FeatureTestCase;

class SuggestRoleForDepartmentTest extends FeatureTestCase
{
    /** CA-09 api-023 */
    public function test_ca09_suggested_role_is_never_admin(): void
    {
        $action = new SuggestRoleForDepartmentAction;

        foreach (Department::query()->get() as $department) {
            $this->assertNotSame('admin', $action->execute($department), $department->code);
        }

        foreach (['presidency', 'information-technology'] as $code) {
            $this->assertSame('executive', $action->execute(new Department(['code' => $code])), $code);
        }
        $this->assertNull($action->execute(new Department(['code' => 'unknown'])));
    }
}
