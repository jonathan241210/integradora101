<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EnclosureController as AdminEnclosureController;
use App\Http\Controllers\Admin\EventController as AdminEventController;
use App\Http\Controllers\Admin\MemoryReviewController;
use App\Http\Controllers\Admin\MemoryReviewImageController;
use App\Http\Controllers\Admin\NewsController;
use App\Http\Controllers\Admin\PublishedSpeciesController;
use App\Http\Controllers\Admin\SpeciesImageController;
use App\Http\Controllers\Admin\SpeciesPublicationController;
use App\Http\Controllers\Admin\SpeciesPublicationRequestController;
use App\Http\Controllers\Admin\SpeciesPublicationRequestImageController;
use App\Http\Controllers\Admin\StaffAccountController;
use App\Http\Controllers\Admin\StaffAccountPasswordController;
use App\Http\Controllers\Admin\StaffAccountStatusController;
use App\Http\Controllers\Admin\StaffAccountTwoFactorController;
use App\Http\Controllers\Admin\TicketCancelController;
use App\Http\Controllers\Admin\TicketController;
use App\Http\Controllers\Admin\TicketPriceController;
use App\Http\Controllers\Admin\TicketQuoteController;
use App\Http\Controllers\Admin\TicketReportController;
use App\Http\Controllers\Admin\TicketReportExportController;
use App\Http\Controllers\Admin\TicketSaleController;
use App\Http\Controllers\Api\AnimalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClinicalEvaluationController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Catalog\EnclosureController;
use App\Http\Controllers\Catalog\EventController;
use App\Http\Controllers\Catalog\NewsController as PublicNewsController;
use App\Http\Controllers\Catalog\PublicMemoryController;
use App\Http\Controllers\Catalog\PublishedSpeciesController as PublicPublishedSpeciesController;
use App\Http\Controllers\Catalog\SpeciesController;
use App\Http\Controllers\Veterinarian\SpeciesController as VeterinarianSpeciesController;
use App\Http\Controllers\Veterinarian\SpeciesPublicationRequestController as VeterinarianSpeciesPublicationRequestController;
use App\Http\Controllers\Visitor\PrivacyNoticeController;
use App\Http\Controllers\Visitor\VisitorAuthenticationController;
use App\Http\Controllers\Visitor\VisitorMemoryController;
use App\Http\Controllers\Visitor\VisitorProfileController;
use App\Http\Controllers\Visitor\VisitorProgressController;
use App\Http\Middleware\EnsureVisitorEmailVerified;
use Illuminate\Support\Facades\Route;

Route::get('/auth/me', MeController::class)
    ->middleware(['auth:sanctum', 'staff.user'])
    ->name('auth.me');

Route::prefix('staff')->name('staff.')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->name('auth.login');

    Route::middleware(['auth:sanctum', 'staff.user'])->group(function () {
        Route::get('auth/session', [AuthController::class, 'me'])->name('auth.session');
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('animals', [AnimalController::class, 'index'])->name('animals.index');
        Route::post('animals', [AnimalController::class, 'store'])->name('animals.store');
        Route::get('animals/{animal}', [AnimalController::class, 'show'])->whereNumber('animal')->name('animals.show');
        Route::post('clinical-evaluations', [ClinicalEvaluationController::class, 'store'])->name('clinical-evaluations.store');
    });
});

Route::get('/species', [SpeciesController::class, 'index'])->name('species.index');
Route::get('/species/{species}', [SpeciesController::class, 'show'])->name('species.show');

// api-015
Route::get('/published-species', [PublicPublishedSpeciesController::class, 'index'])->name('published-species.index');

Route::get('/enclosures', [EnclosureController::class, 'index'])->name('enclosures.index');
Route::get('/enclosures/{enclosure}', [EnclosureController::class, 'show'])->name('enclosures.show');

Route::get('/events', [EventController::class, 'index'])->name('events.index');
Route::get('/events/{event}', [EventController::class, 'show'])->name('events.show');

Route::get('/news', [PublicNewsController::class, 'index'])->name('news.index');
Route::get('/news/{news}', [PublicNewsController::class, 'show'])->name('news.show');

// api-012: lectura pública de momentos aceptados y vigentes (sin autenticación).
Route::get('/memories', [PublicMemoryController::class, 'index'])->name('memories.index');
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

    // api-010: momentos del visitante (correo verificado, api-004 CA-04).
    Route::middleware(['auth:sanctum', 'visitor.token', EnsureVisitorEmailVerified::class])->group(function () {
        Route::post('memories', [VisitorMemoryController::class, 'store'])->name('memories.store');
        Route::get('memories', [VisitorMemoryController::class, 'index'])->name('memories.index');
        Route::post('memories/{id}/resubmit', [VisitorMemoryController::class, 'resubmit'])
            ->whereNumber('id')
            ->name('memories.resubmit');
    });
});

Route::prefix('admin')
    ->name('admin.')
    ->middleware(['auth:sanctum', 'staff.user', 'administrator.two-factor'])
    ->group(function () {
        Route::middleware('permission:users.manage')->group(function () {
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
            Route::get('enclosures', [AdminEnclosureController::class, 'index'])->name('enclosures.index');
            Route::post('enclosures', [AdminEnclosureController::class, 'store'])->name('enclosures.store');
            Route::patch('enclosures/{enclosure}', [AdminEnclosureController::class, 'update'])->name('enclosures.update');
        });

        // api-010: revisión de momentos (solo zoo-admin con memories.review).
        Route::middleware('permission:memories.review')->group(function () {
            Route::get('memories', [MemoryReviewController::class, 'index'])->name('memories.index');
            Route::get('memories/{id}', [MemoryReviewController::class, 'show'])->whereNumber('id')->name('memories.show');
            Route::get('memories/{id}/image', MemoryReviewImageController::class)->whereNumber('id')->name('memories.image');
            Route::post('memories/{id}/accept', [MemoryReviewController::class, 'accept'])->whereNumber('id')->name('memories.accept');
            Route::post('memories/{id}/reject', [MemoryReviewController::class, 'reject'])->whereNumber('id')->name('memories.reject');
        });

        Route::get('dashboard', DashboardController::class)
            ->middleware('permission:dashboard.view')
            ->name('dashboard.show');

        Route::post('tickets/quote', TicketQuoteController::class)
            ->middleware(['permission:tickets.create', 'throttle:ticket-quotes'])
            ->name('tickets.quote');
        Route::post('tickets', [TicketSaleController::class, 'store'])
            ->middleware(['permission:tickets.create', 'throttle:ticket-sales'])
            ->name('tickets.store');
        Route::get('tickets', [TicketController::class, 'index'])
            ->middleware('permission:tickets.view')
            ->name('tickets.index');
        Route::post('tickets/{ticket}/cancel', TicketCancelController::class)
            ->middleware(['permission:tickets.cancel', 'throttle:ticket-cancel'])
            ->name('tickets.cancel');

        Route::get('ticket-prices/current', [TicketPriceController::class, 'current'])
            ->middleware('permission:tickets.create|ticket-prices.manage')
            ->name('ticket-prices.current');
        Route::post('ticket-prices', [TicketPriceController::class, 'store'])
            ->middleware('permission:ticket-prices.manage')
            ->name('ticket-prices.store');

        Route::middleware('permission:reports.view')->group(function () {
            Route::get('reports/tickets', TicketReportController::class)->name('reports.tickets.show');
            Route::get('reports/tickets/export', TicketReportExportController::class)
                ->middleware('throttle:20,1')
                ->name('reports.tickets.export');
        });

        // api-014: species publication review (2FA enforced by the group middleware).
        Route::middleware('permission:species.review')->group(function () {
            Route::get('species-publication-requests', [SpeciesPublicationRequestController::class, 'index'])
                ->name('species-publication-requests.index');
            Route::get('species-publication-requests/{id}', [SpeciesPublicationRequestController::class, 'show'])
                ->whereNumber('id')->name('species-publication-requests.show');
            Route::get('species-publication-requests/{id}/image', SpeciesPublicationRequestImageController::class)
                ->whereNumber('id')->name('species-publication-requests.image');
            Route::patch('species-publication-requests/{id}', [SpeciesPublicationRequestController::class, 'update'])
                ->whereNumber('id')->name('species-publication-requests.update');
            Route::post('species-publication-requests/{id}/reject', [SpeciesPublicationRequestController::class, 'reject'])
                ->whereNumber('id')->name('species-publication-requests.reject');
            Route::post('species-publication-requests/{id}/accept', [SpeciesPublicationRequestController::class, 'accept'])
                ->whereNumber('id')->name('species-publication-requests.accept');

            Route::get('published-species', [PublishedSpeciesController::class, 'index'])
                ->name('published-species.index');
            Route::get('species/{id}/image', [SpeciesImageController::class, 'show'])
                ->whereNumber('id')->name('species.image');
            Route::post('species/{id}/unpublish', [SpeciesPublicationController::class, 'unpublish'])
                ->whereNumber('id')->name('species.unpublish');
            Route::post('species/{id}/republish', [SpeciesPublicationController::class, 'republish'])
                ->whereNumber('id')->name('species.republish');
            Route::get('species/{id}/publication', [SpeciesPublicationController::class, 'show'])
                ->whereNumber('id')->name('species.publication.show');
            Route::patch('species/{id}/publication', [SpeciesPublicationController::class, 'update'])
                ->whereNumber('id')->name('species.publication.update');
            Route::delete('species/{id}/publication', [SpeciesPublicationController::class, 'destroy'])
                ->whereNumber('id')->name('species.publication.destroy');
        });
    });

// api-014: species publication requests, veterinarian family (admin family lives in the admin group above).
Route::prefix('veterinarian')
    ->name('veterinarian.')
    ->middleware(['auth:sanctum', 'staff.user', 'role:veterinarian'])
    ->group(function () {
        Route::get('species', [VeterinarianSpeciesController::class, 'index'])
            ->name('species.index');
        Route::get('species-publication-requests', [VeterinarianSpeciesPublicationRequestController::class, 'index'])
            ->name('species-publication-requests.index');
        Route::post('species-publication-requests', [VeterinarianSpeciesPublicationRequestController::class, 'store'])
            ->name('species-publication-requests.store');
    });
