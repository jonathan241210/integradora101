<?php

namespace App\Actions\Visitor;

use App\Mail\VisitorAccessCodeMail;
use App\Models\Visitor;
use App\Models\VisitorVerificationCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class SendVisitorCodeAction
{
    public function execute(?Visitor $visitor, string $purpose): void
    {
        if ($visitor === null) {
            return;
        }

        if ($purpose === 'email_verification' && $visitor->email_verified_at !== null) {
            return;
        }

        VisitorVerificationCode::query()
            ->where('visitor_id', $visitor->id)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        VisitorVerificationCode::query()->create([
            'visitor_id' => $visitor->id,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(15),
            'attempts' => 0,
        ]);

        Mail::to($visitor->email)->send(new VisitorAccessCodeMail($code, $purpose));
    }
}
