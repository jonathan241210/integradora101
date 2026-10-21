<?php

namespace Tests\Feature\Visitor;

class PrivacyNoticeTest extends VisitorFeatureTestCase
{
    /** CA-15 */
    public function test_ca15_privacy_notice_returns_version_and_content(): void
    {
        $this->assertSame('/api/v1/visitor/legal/privacy-notice', route('visitor.legal.privacy-notice', absolute: false));

        $this->getJson('/api/v1/visitor/legal/privacy-notice')
            ->assertOk()
            ->assertJsonPath('data.version', '2026-10')
            ->assertJsonPath('data.content', trans('visitor.privacy_notice'));
    }
}
