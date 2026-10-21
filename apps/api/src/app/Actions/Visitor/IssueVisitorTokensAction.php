<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorRefreshToken;
use Illuminate\Support\Str;

class IssueVisitorTokensAction
{
    /**
     * @return array{access_token: string, refresh_token: string}
     */
    public function execute(Visitor $visitor, ?string $deviceName, ?string $familyId = null): array
    {
        $familyId ??= (string) Str::uuid();
        $access = $visitor->createToken($familyId, ['visitor'], now()->addMinutes(15));
        $refreshToken = bin2hex(random_bytes(64));

        VisitorRefreshToken::query()->create([
            'visitor_id' => $visitor->id,
            'family_id' => $familyId,
            'token_hash' => hash('sha256', $refreshToken),
            'device_name' => $deviceName,
            'expires_at' => now()->addDays(30),
        ]);

        return [
            'access_token' => $access->plainTextToken,
            'refresh_token' => $refreshToken,
        ];
    }
}
