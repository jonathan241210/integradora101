<?php

namespace App\Actions\Admin\Tickets;

/**
 * Token QR no predecible: 32 bytes aleatorios en base64url (43 caracteres). Unicidad: índice único (DBR-006).
 */
class IssueTicketQrTokenAction
{
    public function execute(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }
}
