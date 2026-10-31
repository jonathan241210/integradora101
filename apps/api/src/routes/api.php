<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EnclosureController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\NewsController;
use App\Http\Controllers\Admin\StaffAccountController;
use App\Http\Controllers\Admin\StaffAccountPasswordController;
use App\Http\Controllers\Admin\StaffAccountStatusController;
use App\Http\Controllers\Admin\StaffAccountTwoFactorController;
use App\Http\Controllers\Admin\TicketReportController;
use App\Http\Controllers\Admin\TicketReportExportController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Catalog\EventController;
use App\Http\Controllers\Catalog\SpeciesController;
use App\Http\Controllers\Visitor\PrivacyNoticeController;
use App\Http\Controllers\Visitor\VisitorAuthenticationController;
use App\Http\Controllers\Visitor\VisitorProfileController;
use App\Http\Controllers\Visitor\VisitorProgressController;
use Illuminate\Support\Facades\Route;

Route::get('/auth/me', MeController::class)
    ->middleware(['auth:sanctum', 'staff.user'])
    ->name('auth.me');

Route::get('/species', [SpeciesController::class, 'index'])->name('species.index');
Route::get('/species/{species}', [SpeciesController::class, 'show'])->name('species.show');

Route::get('/events', [EventController::class, 'index'])->name('events.index');
Route::get('/events/{event}', [EventController::class, 'show'])->name('events.show');
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
        Route::post('discoveries', [VisitorProgressController::class, 'store'])
            ->name('discoveries.store');
        Route::get('progress', [VisitorProgressController::class, 'progress'])
            ->name('progress.show');
        Route::get('collection', [VisitorProgressController::class, 'collection'])
            ->name('collection.show');
        Route::get('achievements', [VisitorProgressController::class, 'achievements'])
            ->name('achievements.index');
        Route::get('missions', [VisitorProgressController::class, 'missions'])
            ->name('missions.index');
    });
});

Route::prefix('admin')
    ->name('admin.')
    ->middleware(['auth:sanctum', 'staff.user', 'administrator.two-factor'])
    ->group(function () {
        Route::middleware('permission:users.manage|operational-staff.manage')->group(function () {
            Route::get('users', [StaffAccountController::class, 'index'])->name('users.index');
            Route::get('users/options', [StaffAccountController::class, 'options'])->name('users.options');
            Route::post('users', [StaffAccountController::class, 'store'])->name('users.store');
            Route::get('users/{user}', [StaffAccountController::class, 'show'])->name('users.show');
            Route::patch('users/{user}', [StaffAccountController::class, 'update'])->name('users.update');
            Route::patch('users/{user}/status', StaffAccountStatusController::class)->name('users.status');
            Route::delete('users/{user}', [StaffAccountController::class, 'destroy'])->name('users.destroy');
            Route::put('users/{user}/password', StaffAccountPasswordController::class)->name('users.password.update');
            Route::delete('users/{user}/two-factor', StaffAccountTwoFactorController::class)->name('users.two-factor.destroy');
        });

        Route::middleware('permission:news.manage')->group(function () {
            Route::get('news', [NewsController::class, 'index'])->name('news.index');
            Route::post('news', [NewsController::class, 'store'])->name('news.store');
            Route::patch('news/{news}', [NewsController::class, 'update'])->name('news.update');
            Route::patch('news/{news}/status', [NewsController::class, 'status'])->name('news.status');
            Route::delete('news/{news}', [NewsController::class, 'destroy'])->name('news.destroy');
        });

        Route::middleware('permission:events.manage')->group(function () {
            Route::get('events', [AdminEventController::class, 'index'])->name('events.index');
            Route::post('events', [AdminEventController::class, 'store'])->name('events.store');
            Route::patch('events/{event}', [AdminEventController::class, 'update'])->name('events.update');
            Route::patch('events/{event}/status', [AdminEventController::class, 'status'])->name('events.status');
            Route::delete('events/{event}', [AdminEventController::class, 'destroy'])->name('events.destroy');
        });

        Route::middleware('permission:enclosures.manage')->group(function () {
            Route::get('enclosures', [EnclosureController::class, 'index'])->name('enclosures.index');
            Route::post('enclosures', [EnclosureController::class, 'store'])->name('enclosures.store');
            Route::patch('enclosures/{enclosure}', [EnclosureController::class, 'update'])->name('enclosures.update');
        });

        Route::get('dashboard', DashboardController::class)
            ->middleware('permission:dashboard.view')
            ->name('dashboard.show');

        Route::middleware('permission:reports.view')->group(function () {
            Route::get('reports/tickets', TicketReportController::class)->name('reports.tickets.show');
            Route::get('reports/tickets/export', TicketReportExportController::class)
                ->middleware('throttle:20,1')
                ->name('reports.tickets.export');
        });
    });
