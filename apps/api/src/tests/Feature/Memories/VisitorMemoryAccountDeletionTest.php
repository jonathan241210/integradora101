<?php

namespace Tests\Feature\Memories;

use Tests\Feature\Visitor\VisitorFeatureTestCase;

/**
 * CA-32 está bloqueado por P9: la enmienda de api-004 (DELETE /api/v1/visitor/me con memories_policy)
 * no está aprobada. Los tests existen con su nombre y se omiten; no se implementa ApplyVisitorMemoriesPolicyAction.
 */
class VisitorMemoryAccountDeletionTest extends VisitorFeatureTestCase
{
    private const PENDING = 'Pendiente de enmienda de api-004 (P9)';

    /** CA-32 */
    public function test_ca32_policy_required_when_memories_exist_returns_422(): void
    {
        $this->markTestSkipped(self::PENDING);
    }

    /** CA-32 */
    public function test_ca32_keep_unlinks_rows_and_keeps_files_and_audits(): void
    {
        $this->markTestSkipped(self::PENDING);
    }

    /** CA-32 */
    public function test_ca32_delete_soft_deletes_rows_and_removes_files_after_commit(): void
    {
        $this->markTestSkipped(self::PENDING);
    }
}
