<?php

use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Catalog\EventController;
use App\Http\Controllers\Catalog\SpeciesController;
use Illuminate\Support\Facades\Route;

Route::get('/auth/me', MeController::class)
    ->middleware('auth:sanctum')
    ->name('auth.me');

Route::get('/species', [SpeciesController::class, 'index'])->name('species.index');
Route::get('/species/{species}', [SpeciesController::class, 'show'])->name('species.show');

Route::get('/events', [EventController::class, 'index'])->name('events.index');
Route::get('/events/{event}', [EventController::class, 'show'])->name('events.show');
