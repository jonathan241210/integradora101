<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ChangeVisitorPasswordAction
{
    public function __construct(private readonly RevokeVisitorSessionAction $revoke) {}

    public function execute(Visitor $visitor, array $data): VisitorAuthResult
    {
        if (! Hash::check((string) ($data['current_password'] ?? ''), $visitor->password)) {
            return VisitorAuthResult::message(422, 'La contraseña no es correcta.');
        }

        $password = Validator::make($data, [
            'password' => ['required', 'string', 'confirmed', app('visitor.password')],
        ]);
        if ($password->fails()) {
            return VisitorAuthResult::message(422, $password->errors()->first());
        }

        $visitor->password = $data['password'];
        $visitor->save();

        $token = $visitor->currentAccessToken();
        $this->revoke->execute($visitor, 'others', $token?->name, $token?->id);

        return VisitorAuthResult::message(200, 'Contraseña actualizada.');
    }
}
