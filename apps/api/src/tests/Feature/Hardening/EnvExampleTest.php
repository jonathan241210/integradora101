<?php

namespace Tests\Feature\Hardening;

use Tests\TestCase;

/** api-028 · .env.example seguro (CA-14). */
class EnvExampleTest extends TestCase
{
    /** CA-14 pre-delivery-hardening */
    public function test_ca14_env_example_is_safe_by_default_and_has_no_real_host(): void
    {
        $content = (string) file_get_contents(base_path('.env.example'));

        $this->assertMatchesRegularExpression('/^APP_DEBUG=false\s*$/m', $content);
        $this->assertMatchesRegularExpression('/^LOG_LEVEL=warning\s*$/m', $content);
        $this->assertMatchesRegularExpression('/^DB_HOST=\S*example\S*$/m', $content);
        $this->assertStringNotContainsString('aivencloud.com', $content);
        $this->assertStringContainsString('TRUSTED_PROXIES=', $content);
    }
}
