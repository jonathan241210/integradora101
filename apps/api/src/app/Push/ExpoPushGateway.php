<?php

namespace App\Push;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ExpoPushGateway implements PushGateway
{
    public function send(array $messages): void
    {
        $token = (string) config('push.access_token');
        $pending = Http::acceptJson()->timeout(20);
        $ca = (string) config('push.ca_bundle');
        if ($ca !== '') {
            $pending = $pending->withOptions(['verify' => $ca]);
        }
        if ($token !== '') {
            $pending = $pending->withToken($token);
        }

        foreach (array_chunk($messages, 100) as $chunk) {
            $response = $pending->post((string) config('push.url'), $chunk);
            if (! $response->successful()) {
                throw new RuntimeException('El servicio push respondió '.$response->status().'.');
            }

            $this->guardTickets($response->json('data'), count($chunk));
        }
    }

    private function guardTickets(mixed $tickets, int $expected): void
    {
        $tickets = is_array($tickets) && array_is_list($tickets) ? array_slice($tickets, 0, $expected) : [];
        $accepted = 0;
        $errors = 0;
        foreach ($tickets as $ticket) {
            $status = is_array($ticket) ? ($ticket['status'] ?? null) : null;
            if ($status === 'ok' && is_string($ticket['id'] ?? null) && $ticket['id'] !== '') {
                $accepted++;
            } elseif ($status === 'error') {
                $errors++;
            }
        }

        Log::info('Tickets del proveedor push.', [
            'accepted' => $accepted,
            'rejected' => $errors,
            'unconfirmed' => $expected - $accepted - $errors,
        ]);

        if ($errors > 0 && $errors === count($tickets)) {
            throw new RuntimeException('Expo rechazó todos los avisos del lote.');
        }
    }
}
