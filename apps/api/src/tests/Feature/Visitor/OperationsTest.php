<?php

namespace Tests\Feature\Visitor;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\URL;

class OperationsTest extends VisitorFeatureTestCase
{
    /** CA-20 */
    public function test_ca20_https_outside_local_and_mail_from_env(): void
    {
        $example = file_get_contents(base_path('.env.example'));
        $this->assertIsString($example);
        $this->assertMatchesRegularExpression('/^MAIL_MAILER=log$/m', $example);
        $this->assertMatchesRegularExpression('/^MAIL_PASSWORD=null$/m', $example);
        $this->assertSame(env('MAIL_MAILER'), config('mail.default'));

        $this->app->detectEnvironment(fn () => 'production');
        (new AppServiceProvider($this->app))->forceHttps();

        $this->assertStringStartsWith('https://', url('/api/v1/visitor/legal/privacy-notice'));
        URL::forceScheme('http');
    }
}
