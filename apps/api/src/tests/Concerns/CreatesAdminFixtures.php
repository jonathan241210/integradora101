<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\DB;

trait CreatesAdminFixtures
{
    /** Inserta un boleto con purchased_at en UTC (la hora se guarda en UTC). */
    protected function insertTicket(string $purchasedAtUtc, int $adults, int $children, string $total): int
    {
        return DB::table('tickets')->insertGetId([
            'adult_quantity' => $adults,
            'child_quantity' => $children,
            'total_amount' => $total,
            'purchased_at' => $purchasedAtUtc,
            'qr_code' => 'QR-'.bin2hex(random_bytes(10)),
            'cashier_id' => null,
        ]);
    }

    /** Elimina boletos del rango dentro de la transacción de la prueba (se revierte al terminar). */
    protected function clearTickets(string $fromUtc, string $toUtc): void
    {
        DB::table('tickets')->whereBetween('purchased_at', [$fromUtc, $toUtc])->delete();
    }
}
