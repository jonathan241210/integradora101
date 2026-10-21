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
}
