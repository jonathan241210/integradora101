<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;

class UpdateVisitorProfileAction
{
    public function execute(Visitor $visitor, array $data): Visitor
    {
        $visitor->fill([
            'first_name' => $data['first_name'],
            'nickname' => $data['nickname'],
            'avatar_code' => $data['avatar_code'],
        ])->save();

        return $visitor->refresh();
    }
}
