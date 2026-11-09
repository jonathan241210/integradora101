<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use App\Models\VisitorVerificationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ConsumeVisitorCodeAction
{
    public function execute(Visitor $visitor, string $purpose, string $plainCode): bool
    {
        return DB::transaction(function () use ($visitor, $purpose, $plainCode) {
            $row = VisitorVerificationCode::query()
                ->where('visitor_id', $visitor->id)
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if ($row === null || $row->expires_at->lte(now()) || $row->attempts >= 5) {
                return false;
            }

            if (! Hash::check($plainCode, $row->code_hash)) {
                $row->attempts++;
                if ($row->attempts >= 5) {
                    $row->consumed_at = now();
                }
                $row->save();

                return false;
            }

            $row->consumed_at = now();
            $row->save();

            return true;
        });
    }

    /**
     * @param  list<string>  $purposes
     */
    public function match(Visitor $visitor, string $plainCode, array $purposes): ?string
    {
        return DB::transaction(function () use ($visitor, $plainCode, $purposes) {
            $rows = VisitorVerificationCode::query()
                ->where('visitor_id', $visitor->id)
                ->whereIn('purpose', $purposes)
                ->whereNull('consumed_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();

            $pending = $rows->filter(
                fn (VisitorVerificationCode $row): bool => $row->expires_at->gt(now()) && $row->attempts < 5,
            )->values();

            foreach ($pending as $row) {
                if (! Hash::check($plainCode, $row->code_hash)) {
                    continue;
                }

                $row->consumed_at = now();
                $row->save();

                return $row->purpose;
            }

            $newest = $pending->first();
            if ($newest === null) {
                return null;
            }

            $newest->attempts++;
            if ($newest->attempts >= 5) {
                $newest->consumed_at = now();
            }
            $newest->save();

            return null;
        });
    }
}
