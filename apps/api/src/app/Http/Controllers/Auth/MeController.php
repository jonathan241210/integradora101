<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\StaffProfileResource;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function __invoke(Request $request): StaffProfileResource
    {
        return new StaffProfileResource($request->user()->load(['department', 'roles.permissions']));
    }
}
