<?php

use App\Http\Controllers\Auth\MeController;
use Illuminate\Support\Facades\Route;

Route::get('/auth/me', MeController::class)
    ->middleware('auth:sanctum')
    ->name('auth.me');
