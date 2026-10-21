<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorRefreshToken;
use Laravel\Sanctum\PersonalAccessToken;

class RevokeVisitorSessionAction
{
    public function execute(Visitor $visitor, string $scope, ?string $familyId = null, int|string|null $keepTokenId = null): void
    {
        if ($scope === 'device' && $familyId !== null) {
            $this->accessTokens($visitor)->where('name', $familyId)->delete();
            VisitorRefreshToken::query()
                ->where('family_id', $familyId)
                ->update(['revoked_at' => now()]);

            return;
        }

        if ($scope === 'others') {
            $tokens = $this->accessTokens($visitor);
            if ($keepTokenId !== null) {
                $tokens->where('id', '!=', $keepTokenId);
            }
            $tokens->delete();

            $refresh = VisitorRefreshToken::query()->where('visitor_id', $visitor->id);
            if ($familyId !== null) {
                $refresh->where('family_id', '!=', $familyId);
            }
            $refresh->update(['revoked_at' => now()]);

            return;
        }

        $this->accessTokens($visitor)->delete();
        VisitorRefreshToken::query()
            ->where('visitor_id', $visitor->id)
            ->update(['revoked_at' => now()]);
    }

    private function accessTokens(Visitor $visitor)
    {
        return PersonalAccessToken::query()
            ->where('tokenable_type', $visitor->getMorphClass())
            ->where('tokenable_id', $visitor->getKey());
    }
}
