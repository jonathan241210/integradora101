<?php

namespace App\Actions\Admin;

use Illuminate\Database\Eloquent\Model;

class FindAdminResourceAction
{
    /**
     * @param  class-string<Model>  $model
     */
    public function execute(string $model, string $id, string $notFoundMessage): Model
    {
        abort_unless(ctype_digit($id), 404, $notFoundMessage);

        $found = $model::query()->find((int) $id);

        abort_if($found === null, 404, $notFoundMessage);

        return $found;
    }
}
