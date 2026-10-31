<?php

namespace Tests\Feature\Admin;

use App\Models\Enclosure;
use App\Models\Event;
use App\Models\News;
use App\Models\User;
use Spatie\Activitylog\Models\Activity;

class AdminAuditTest extends AdminFeatureTestCase
{
    /** CA-26 */
    public function test_ca26_administration_management_audits_actions_without_passwords_or_secrets(): void
    {
        $admin = $this->createAccount('admin');
        $this->actAs($admin);

        $account = $this->validAccount('cashier');
        $userId = $this->postJson('/api/v1/admin/users', $account)->assertCreated()->json('data.id');
        $this->patchJson("/api/v1/admin/users/{$userId}", ['first_name' => 'Editada', 'last_name' => 'Cuenta', 'department_id' => $account['department_id'], 'role' => 'cashier'])->assertOk();
        $this->patchJson("/api/v1/admin/users/{$userId}/status", ['is_active' => false])->assertOk();
        $this->putJson("/api/v1/admin/users/{$userId}/password", ['password' => 'N3w!Passphrase#77'])->assertNoContent();
        $this->deleteJson("/api/v1/admin/users/{$userId}/two-factor")->assertNoContent();
        $this->deleteJson("/api/v1/admin/users/{$userId}")->assertNoContent();

        $newsId = $this->postJson('/api/v1/admin/news', [
            'title' => 'Noticia auditada', 'content' => 'SECRET-BODY-TEXT', 'category' => 'Institucional', 'published_date' => '2026-10-30',
        ])->assertCreated()->json('data.id');
        $this->patchJson("/api/v1/admin/news/{$newsId}", [
            'title' => 'Noticia auditada 2', 'content' => 'SECRET-BODY-TEXT', 'category' => 'Institucional', 'published_date' => '2026-10-30',
        ])->assertOk();
        $this->patchJson("/api/v1/admin/news/{$newsId}/status", ['is_active' => false])->assertOk();
        $this->deleteJson("/api/v1/admin/news/{$newsId}")->assertNoContent();

        $eventId = $this->postJson('/api/v1/admin/events', ['name' => 'Evento auditado', 'start_date' => '2099-01-01'])->assertCreated()->json('data.id');
        $this->patchJson("/api/v1/admin/events/{$eventId}", ['name' => 'Evento auditado 2', 'start_date' => '2099-01-01'])->assertOk();
        $this->patchJson("/api/v1/admin/events/{$eventId}/status", ['is_active' => false])->assertOk();
        $this->deleteJson("/api/v1/admin/events/{$eventId}")->assertNoContent();

        $enclosureId = $this->postJson('/api/v1/admin/enclosures', ['name' => 'Recinto auditado '.bin2hex(random_bytes(3))])->assertCreated()->json('data.id');
        $this->patchJson("/api/v1/admin/enclosures/{$enclosureId}", ['name' => 'Recinto renombrado '.bin2hex(random_bytes(3))])->assertOk();

        $this->get('/api/v1/admin/reports/tickets/export?period=week&format=csv')->assertOk()->streamedContent();

        $activities = Activity::query()->where('log_name', 'admin')->where('causer_id', $admin->id)->get();
        $has = fn (string $event, ?string $type) => $activities->contains(
            fn (Activity $a) => $a->event === $event && $a->subject_type === $type && ($type === null || $a->subject_id !== null)
        );

        foreach (['created', 'updated', 'status-changed', 'deleted'] as $event) {
            foreach ([User::class, News::class, Event::class] as $type) {
                $this->assertTrue($has($event, $type), "Falta {$event} para {$type}");
            }
        }
        $this->assertTrue($has('password-reset', User::class));
        $this->assertTrue($has('two-factor-reset', User::class));
        $this->assertTrue($has('created', Enclosure::class));
        $this->assertTrue($has('updated', Enclosure::class));
        $this->assertTrue($has('report-exported', null));

        foreach ($activities as $activity) {
            $this->assertSame(User::class, $activity->causer_type);
            $serialized = json_encode($activity->properties).$activity->description;
            foreach (['Str0ng!Passphrase#9', 'N3w!Passphrase#77', 'SECRET-BODY-TEXT', 'two_factor_secret', 'remember_token', 'password'] as $secret) {
                $this->assertStringNotContainsString($secret, $serialized);
            }
        }
    }
}
