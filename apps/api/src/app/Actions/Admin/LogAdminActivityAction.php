<?php

namespace App\Actions\Admin;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class LogAdminActivityAction
{
    private const FORBIDDEN_KEYS = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes', 'qr_code', 'content'];

    public function execute(string $event, string $description, ?Model $subject = null, array $properties = []): void
    {
        $logger = activity('admin')
            ->causedBy(Auth::user())
            ->event($event)
            ->withProperties(array_diff_key($properties, array_flip(self::FORBIDDEN_KEYS)));

        if ($subject !== null) {
            $logger->performedOn($subject);
        }

        $logger->log($description);
    }
}
