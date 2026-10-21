<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LoginVisitorAction
{
    public function __construct(
        private readonly IssueVisitorTokensAction $tokens,
        private readonly LogVisitorAccessAction $log,
    ) {}

    public function execute(string $email, string $password, string $deviceName, Request $request): VisitorAuthResult
    {
        $visitor = Visitor::query()->where('email', Str::lower($email))->first();

        if ($visitor === null || ! $visitor->is_active || ! Hash::check($password, $visitor->password)) {
            return VisitorAuthResult::message(422, 'Correo o contraseña incorrectos.');
        }

        if ($visitor->email_verified_at === null) {
            return VisitorAuthResult::message(403, 'Confirma tu correo antes de entrar.', 'email_not_verified');
        }

        $visitor->forceFill(['last_login_at' => now()])->save();
        $issued = $this->tokens->execute($visitor, $deviceName);
        $this->log->execute('login', $visitor->email, $visitor, $request);

        return VisitorAuthResult::tokens($visitor, $issued['access_token'], $issued['refresh_token']);
    }
}
