<?php

namespace App\Actions\Visitor;

use App\Models\Visitor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DeleteVisitorAccountAction
{
    public function __construct(private readonly LogVisitorAccessAction $log) {}

    public function execute(Visitor $visitor, string $password, Request $request): VisitorAuthResult
    {
        if (! Hash::check($password, $visitor->password)) {
            return VisitorAuthResult::message(422, 'La contraseña no es correcta.');
        }

        $this->log->execute('deleted', $visitor->email, $visitor, $request);
        $visitor->tokens()->delete();
        $visitor->delete();

        return VisitorAuthResult::message(204, '');
    }
}
