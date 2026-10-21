<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Support\Str;

class VerifyVisitorEmailAction
{
    public function __construct(
        private readonly ConsumeVisitorCodeAction $codes,
        private readonly IssueVisitorTokensAction $tokens,
    ) {}

    public function execute(string $email, string $code): VisitorAuthResult
    {
        $visitor = Visitor::query()->where('email', Str::lower($email))->first();

        if ($visitor === null || ! $this->codes->execute($visitor, 'email_verification', $code)) {
            return VisitorAuthResult::message(422, 'El código no es válido.');
        }

        $visitor->forceFill(['email_verified_at' => now()])->save();
        $issued = $this->tokens->execute($visitor, null);

        return VisitorAuthResult::tokens($visitor, $issued['access_token'], $issued['refresh_token']);
    }
}
