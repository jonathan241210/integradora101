<?php

use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Staff\StaffUserController;
use App\Http\Controllers\Visitor\PrivacyNoticeController;
use App\Http\Controllers\Visitor\VisitorAuthenticationController;
use App\Http\Controllers\Visitor\VisitorProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'staff.user', 'administrator.two-factor', 'throttle:staff-users'])
    ->prefix('staff-users')
    ->name('staff-users.')
    ->group(function () {
        Route::get('catalog', [StaffUserController::class, 'catalog'])->name('catalog');
        Route::get('/', [StaffUserController::class, 'index'])->name('index');
        Route::post('/', [StaffUserController::class, 'store'])->name('store');
        Route::patch('{staffUser}', [StaffUserController::class, 'update'])->name('update');
        Route::delete('{staffUser}', [StaffUserController::class, 'destroy'])->name('destroy');
    });

Route::get('/auth/me', MeController::class)
    ->middleware(['auth:sanctum', 'staff.user'])
    ->name('auth.me');

Route::prefix('visitor')->name('visitor.')->group(function () {
    Route::get('legal/privacy-notice', PrivacyNoticeController::class)
        ->name('legal.privacy-notice');

    Route::post('auth/register', [VisitorAuthenticationController::class, 'register'])
        ->middleware('throttle:visitor-register')
        ->name('auth.register');
    Route::post('auth/email/verify', [VisitorAuthenticationController::class, 'verify'])
        ->name('auth.email.verify');
    Route::post('auth/email/resend', [VisitorAuthenticationController::class, 'resend'])
        ->middleware('throttle:visitor-resend')
        ->name('auth.email.resend');
    Route::post('auth/login', [VisitorAuthenticationController::class, 'login'])
        ->middleware('throttle:visitor-login')
        ->name('auth.login');
    Route::post('auth/refresh', [VisitorAuthenticationController::class, 'refresh'])
        ->name('auth.refresh');
    Route::post('auth/password/forgot', [VisitorAuthenticationController::class, 'forgot'])
        ->middleware('throttle:visitor-forgot')
        ->name('auth.password.forgot');
    Route::post('auth/password/reset', [VisitorAuthenticationController::class, 'reset'])
        ->name('auth.password.reset');

    Route::middleware(['auth:sanctum', 'visitor.token'])->group(function () {
        Route::post('auth/logout', [VisitorAuthenticationController::class, 'logout'])
            ->name('auth.logout');
        Route::get('me', [VisitorProfileController::class, 'show'])
            ->name('me.show');
        Route::patch('me', [VisitorProfileController::class, 'update'])
            ->name('me.update');
        Route::put('me/password', [VisitorProfileController::class, 'password'])
            ->name('me.password.update');
        Route::delete('me', [VisitorProfileController::class, 'destroy'])
            ->name('me.destroy');
    });
});
