<?php

namespace Tests\Feature\Staff;

use Tests\TestCase;

class LegacyRoleDecisionsTest extends TestCase
{
    /** @return list<string> */
    private function sources(string $dir): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(base_path($dir)));
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }

        return $files;
    }

    /** CA-27 api-023 */
    public function test_ca27_no_legacy_permission_or_role_name_decisions(): void
    {
        foreach ([...$this->sources('app'), ...$this->sources('routes')] as $path) {
            $code = file_get_contents($path);
            foreach (['operational-staff.manage', 'FULL_READ_ROLES', 'ResolveManageableRolesAction'] as $legacy) {
                $this->assertStringNotContainsString($legacy, $code, "$legacy en $path");
            }
        }

        // RN-03: estas decisiones salen de permisos. GuardAdministratorContinuityAction queda fuera: la continuidad
        // de administradores es una invariante de rol (T-19).
        foreach ([
            'app/Actions/Auth/ResolveStaffHomeAction.php',
            'app/Actions/Admin/Tickets/ListTicketHistoryAction.php',
            'app/Console/Commands/CreateStaffCommand.php',
        ] as $relative) {
            $code = file_get_contents(base_path($relative));
            $this->assertDoesNotMatchRegularExpression('/hasRole\(|hasAnyRole\(|->role\(|Role::query|Role::all/', $code, $relative);
        }
    }
}
