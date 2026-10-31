<?php

use App\Http\Controllers\Api\AnimalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClinicalEvaluationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->name('auth.login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        Route::get('animals', [AnimalController::class, 'index'])->name('animals.index');
        Route::post('animals', [AnimalController::class, 'store'])->name('animals.store');

        Route::post('clinical-evaluations', [ClinicalEvaluationController::class, 'store'])
            ->name('clinical-evaluations.store');
    });
});
