<?php

namespace App\Actions\SpeciesPublication\Audit;

use App\Actions\Admin\LogAdminActivityAction;
use Illuminate\Database\Eloquent\Model;

class LogSpeciesPublicationAction
{
    public function __construct(private readonly LogAdminActivityAction $log) {}

    /**
     * Records an operation in Activitylog (log "admin"). Never pass paths or binaries.
     *
     * @param  array<string, mixed>  $properties
     */
    public function execute(string $event, string $description, ?Model $subject = null, array $properties = []): void
    {
        $this->log->execute($event, $description, $subject, $properties);
    }
}
