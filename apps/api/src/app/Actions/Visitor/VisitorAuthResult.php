<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;

final class VisitorAuthResult
{
    public function __construct(
        public readonly int $status,
        public readonly string $message = '',
        public readonly ?string $code = null,
        public readonly ?string $accessToken = null,
        public readonly ?string $refreshToken = null,
        public readonly ?Visitor $visitor = null,
    ) {}

    public static function message(int $status, string $message, ?string $code = null): self
    {
        return new self($status, $message, $code);
    }

    public static function tokens(Visitor $visitor, string $accessToken, string $refreshToken): self
    {
        return new self(200, '', null, $accessToken, $refreshToken, $visitor);
    }
}
