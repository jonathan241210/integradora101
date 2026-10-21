<?php

namespace Tests\Feature\Visitor;

use App\Models\Visitor;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class PasswordPolicyTest extends VisitorFeatureTestCase
{
    /** CA-17 */
    public function test_ca17_password_rule_and_bcrypt(): void
    {
        $weak = $this->visitorPayload($this->visitorEmail(), [
            'password' => 'sololetras',
            'password_confirmation' => 'sololetras',
        ]);
        $this->postJson('/api/v1/visitor/auth/register', $weak)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'La contraseña debe tener al menos 8 caracteres, con letras y números.');

        $short = $this->visitorPayload($this->visitorEmail(), [
            'password' => 'abc12',
            'password_confirmation' => 'abc12',
        ]);
        $this->postJson('/api/v1/visitor/auth/register', $short)->assertUnprocessable();

        $email = $this->visitorEmail();
        $this->postJson('/api/v1/visitor/auth/register', $this->visitorPayload($email))->assertCreated();
        $visitor = Visitor::query()->where('email', $email)->firstOrFail();
        $this->assertTrue(Hash::check('secreta12', $visitor->password));
        $this->assertStringStartsWith('$2', $visitor->password);

        $staff = Validator::make(
            ['password' => 'secreta12'],
            ['password' => [Password::defaults()]],
        );
        $this->assertTrue($staff->fails());
    }
}
