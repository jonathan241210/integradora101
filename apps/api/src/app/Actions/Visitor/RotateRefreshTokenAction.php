<?php

namespace App\Actions\Visitor;

use App\Models\VisitorRefreshToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RotateRefreshTokenAction
{
    public function __construct(
        private readonly IssueVisitorTokensAction $tokens,
        private readonly LogVisitorAccessAction $log,
    ) {}

    public function execute(string $plainRefresh, Request $request): VisitorAuthResult
    {
        $hash = hash('sha256', $plainRefresh);
        $lock = Cache::lock('visitor-refresh:'.$hash, 10);

        try {
            $lock->block(5);

            return DB::transaction(function () use ($hash, $request) {
                $row = VisitorRefreshToken::query()
                    ->where('token_hash', $hash)
                    ->lockForUpdate()
                    ->first();

                if ($row === null) {
                    return $this->invalid();
                }

                if ($row->revoked_at !== null || $row->replaced_by_id !== null) {
                    if (! Cache::get($this->graceKey($hash))) {
                        $this->revokeFamily($row);
                    }

                    return $this->invalid();
                }

                if ($row->expires_at->lte(now())) {
                    return $this->invalid();
                }

                $visitor = $row->visitor;
                $visitor->tokens()->where('name', $row->family_id)->delete();
                $issued = $this->tokens->execute($visitor, $row->device_name, $row->family_id);
                $replacement = VisitorRefreshToken::query()
                    ->where('token_hash', hash('sha256', $issued['refresh_token']))
                    ->first();

                $row->replaced_by_id = $replacement?->id;
                $row->save();
                Cache::put($this->graceKey($hash), true, now()->addSeconds(10));
                $this->log->execute('refresh', $visitor->email, $visitor, $request);

                return VisitorAuthResult::tokens($visitor, $issued['access_token'], $issued['refresh_token']);
            });
        } finally {
            $lock->release();
        }
    }

    private function revokeFamily(VisitorRefreshToken $row): void
    {
        VisitorRefreshToken::query()
            ->where('family_id', $row->family_id)
            ->update(['revoked_at' => now()]);

        $row->visitor->tokens()->where('name', $row->family_id)->delete();
    }

    private function graceKey(string $hash): string
    {
        return 'visitor-refresh-rotated:'.$hash;
    }

    private function invalid(): VisitorAuthResult
    {
        return VisitorAuthResult::message(401, 'La sesión ya no es válida. Vuelve a entrar.');
    }
}
