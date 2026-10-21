<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ResetVisitorPasswordAction
{
    public function __construct(
        private readonly ConsumeVisitorCodeAction $codes,
        private readonly RevokeVisitorSessionAction $revoke,
        private readonly LogVisitorAccessAction $log,
    ) {}

    public function execute(array $data, Request $request): VisitorAuthResult
    {
        $password = Validator::make($data, [
            'password' => ['required', 'string', 'confirmed', app('visitor.password')],
        ]);
        if ($password->fails()) {
            return VisitorAuthResult::message(422, $password->errors()->first());
        }

        $visitor = Visitor::query()->where('email', Str::lower((string) $data['email']))->first();

        if ($visitor === null || ! $this->codes->execute($visitor, 'password_reset', (string) $data['code'])) {
            return VisitorAuthResult::message(422, 'El código no es válido.');
        }

        $visitor->password = $data['password'];
        $visitor->save();
        $this->revoke->execute($visitor, 'all');
        $this->log->execute('password_reset', $visitor->email, $visitor, $request);

        return VisitorAuthResult::message(200, 'Contraseña actualizada. Vuelve a entrar.');
    }
}
