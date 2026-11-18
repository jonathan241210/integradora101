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

            $this->guardTickets($response->json('data'));
        }
    }

    private function guardTickets(mixed $tickets): void
    {
        if (! is_array($tickets) || $tickets === []) {
            return;
        }

        $errors = 0;
        foreach ($tickets as $ticket) {
            if (! is_array($ticket) || ($ticket['status'] ?? null) !== 'error') {
                continue;
            }

            $errors++;
            Log::warning('Expo rechazó un aviso.', [
                'error' => $ticket['details']['error'] ?? null,
                'message' => $ticket['message'] ?? null,
            ]);
        }

        if ($errors === count($tickets)) {
            throw new RuntimeException('Expo rechazó todos los avisos del lote.');
        }
    }
}
