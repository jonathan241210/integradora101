<?php

namespace App\Push;

use RuntimeException;

class FakePushGateway implements PushGateway
{
    /** @var list<array<string, mixed>> */
    public array $messages = [];

    public bool $fail = false;

    public function send(array $messages): void
    {
        if ($this->fail) {
            throw new RuntimeException('Proveedor no disponible.');
        }

        array_push($this->messages, ...$messages);
    }
}
