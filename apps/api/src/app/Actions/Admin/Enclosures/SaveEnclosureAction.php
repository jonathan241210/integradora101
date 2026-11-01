<?php

namespace App\Actions\Admin\Enclosures;

use App\Actions\Admin\LogAdminActivityAction;
use App\Models\Enclosure;

class SaveEnclosureAction
{
    public function __construct(private LogAdminActivityAction $log) {}

    public function execute(?Enclosure $enclosure, array $data): Enclosure
    {
        $creating = $enclosure === null;
        $enclosure ??= new Enclosure;
        $previous = $enclosure->name;

        $enclosure->name = trim($data['name']);
        $enclosure->save();
        $enclosure->loadCount('animals');

        $this->log->execute(
            $creating ? 'created' : 'updated',
            $creating ? 'Recinto creado' : 'Recinto renombrado',
            $enclosure,
            $creating ? ['name' => $enclosure->name] : ['old_name' => $previous, 'name' => $enclosure->name],
        );

        return $enclosure;
    }
}
