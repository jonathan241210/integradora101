<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorPushToken;

class UpsertVisitorPushTokenAction
{
    public function execute(Visitor $visitor, string $token, string $platform): VisitorPushToken
    {
        $row = VisitorPushToken::query()->where('token', $token)->first();

        if ($row === null) {
            return VisitorPushToken::query()->create([
                'visitor_id' => $visitor->id,
                'token' => $token,
                'platform' => $platform,
            ]);
        }

        $row->forceFill([
            'visitor_id' => $visitor->id,
            'platform' => $platform,
        ])->save();

        return $row;
    }
}
