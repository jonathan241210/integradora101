<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorRefreshToken;
use Illuminate\Http\Request;

class LogoutVisitorAction
{
    public function __construct(
        private readonly RevokeVisitorSessionAction $revoke,
        private readonly LogVisitorAccessAction $log,
    ) {}

    public function execute(Visitor $visitor, string $plainRefresh, Request $request): VisitorAuthResult
    {
        $row = VisitorRefreshToken::query()
            ->where('token_hash', hash('sha256', $plainRefresh))
            ->first();

        if ($row === null || $row->visitor_id !== $visitor->id) {
            return VisitorAuthResult::message(422, 'La sesión no coincide con esta cuenta.');
        }

        $this->revoke->execute($visitor, 'device', $row->family_id);
        $visitor->currentAccessToken()?->delete();
        $this->log->execute('logout', $visitor->email, $visitor, $request);

        return VisitorAuthResult::message(204, '');
    }
}
