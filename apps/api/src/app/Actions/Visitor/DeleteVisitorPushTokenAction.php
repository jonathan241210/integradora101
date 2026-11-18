<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorPushToken;

class DeleteVisitorPushTokenAction
{
    public function execute(Visitor $visitor, string $token): bool
    {
        $row = VisitorPushToken::query()->where('token', $token)->first();

        if ($row === null || (int) $row->visitor_id !== (int) $visitor->id) {
            return false;
        }

        $row->delete();

        return true;
    }
}
