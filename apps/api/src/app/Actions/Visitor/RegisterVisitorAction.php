<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class RegisterVisitorAction
{
    public function __construct(
        private readonly SendVisitorCodeAction $codes,
        private readonly LogVisitorAccessAction $log,
    ) {}

    public function execute(array $data, Request $request): VisitorAuthResult
    {
        if (($data['is_adult'] ?? null) !== true) {
            return VisitorAuthResult::message(422, 'Debes ser mayor de 18 años.');
        }

        if (($data['privacy_notice_version'] ?? null) !== config('visitor.privacy_notice_version')) {
            return VisitorAuthResult::message(422, 'Debes aceptar el aviso de privacidad vigente.');
        }

        if (! in_array($data['avatar_code'] ?? null, config('visitor.avatar_codes'), true)) {
            return VisitorAuthResult::message(422, 'Elige un avatar del catálogo.');
        }

        $email = Str::lower((string) ($data['email'] ?? ''));
        if (Visitor::query()->where('email', $email)->exists()) {
            return VisitorAuthResult::message(422, 'Ese correo ya está registrado.');
        }

        $password = Validator::make($data, [
            'password' => ['required', 'string', 'confirmed', app('visitor.password')],
        ]);
        if ($password->fails()) {
            return VisitorAuthResult::message(422, $password->errors()->first());
        }

        $visitor = Visitor::query()->create([
            'email' => $email,
            'first_name' => $data['first_name'],
            'nickname' => $data['nickname'],
            'password' => $data['password'],
            'avatar_code' => $data['avatar_code'],
            'is_active' => true,
            'adult_confirmed_at' => now(),
            'privacy_notice_version' => $data['privacy_notice_version'],
            'privacy_accepted_at' => now(),
        ]);

        $this->log->execute('registered', $visitor->email, $visitor, $request);
        $this->codes->execute($visitor, 'email_verification');

        return VisitorAuthResult::message(201, 'Te enviamos un código de 6 dígitos para verificar tu correo.');
    }
}
