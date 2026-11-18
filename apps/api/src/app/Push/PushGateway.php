<?php

namespace App\Push;

interface PushGateway
{
    /**
     * @param  list<array<string, mixed>>  $messages
     */
    public function send(array $messages): void;
}
