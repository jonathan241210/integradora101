<?php

namespace Tests\Feature\Admin;

use App\Models\CancellationReview;
use Illuminate\Support\Facades\DB;

/** api-027: permisos y lecturas sin escritura. */
class CancellationReviewAccessTest extends CancellationReviewTestCase
{
    /** CA-02 cancellation-review-signals */
    public function test_ca02_roles_without_permission_get_403_on_all_review_routes(): void
    {
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $this->wipe();
        $this->attentionDay($cashier, self::DAY);
        $body = ['cashier_id' => $cashier->id, 'business_date' => self::DAY, 'status' => 'reviewed_ok', 'note' => 'Nota de revisión suficiente.'];
        $reviews = self::URL.'/reviews';
        $before = CancellationReview::withTrashed()->count();

        $this->getJson(self::URL.'?'.self::RANGE)->assertUnauthorized();
        $this->postJson($reviews, $body)->assertUnauthorized();
        $this->getJson($reviews."?cashier_id={$cashier->id}&business_date=".self::DAY)->assertUnauthorized();

        foreach (['zoo-admin', 'executive', 'cashier', 'veterinarian'] as $role) {
            $user = $this->createAccount($role);
            $this->actAs($user)->getJson(self::URL.'?'.self::RANGE)->assertForbidden();
            $this->actAs($user)->get(self::URL.'/export?'.self::RANGE.'&format=csv')->assertForbidden();
            $this->actAs($user)->postJson($reviews, $body)->assertForbidden();
            $this->actAs($user)->getJson($reviews."?cashier_id={$cashier->id}&business_date=".self::DAY)->assertForbidden();
        }

        $this->assertSame($before, CancellationReview::withTrashed()->count());

        // admin sin 2FA confirmado tampoco entra.
        $noTwoFactor = $this->createAccount('admin', false);
        $this->actAs($noTwoFactor)->postJson($reviews, $body)->assertForbidden();
    }

    /** CA-03 cancellation-review-signals */
    public function test_ca03_read_routes_write_nothing(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['first_name' => 'Laura']);
        $this->wipe();
        $this->attentionDay($cashier, self::DAY);
        CancellationReview::query()->create([
            'cashier_id' => $cashier->id, 'business_date' => self::DAY, 'status' => 'clarification_required',
            'note' => 'Pendiente de aclaración.', 'reviewed_by' => $admin->id,
        ]);

        $tickets = DB::table('tickets')->orderBy('id')->get()->toJson();
        $reviews = DB::table('cancellation_reviews')->orderBy('id')->get()->toJson();
        $activity = DB::table('activity_log')->count();
        $reviewEvents = $this->activityCount('cashier-day-reviewed');

        $this->actAs($admin)->getJson(self::URL.'?'.self::RANGE)->assertOk();
        $this->actAs($admin)->getJson(self::URL."/reviews?cashier_id={$cashier->id}&business_date=".self::DAY)->assertOk();
        $this->actAs($admin)->getJson('/api/v1/admin/pending-counts')->assertOk();

        $this->assertSame($tickets, DB::table('tickets')->orderBy('id')->get()->toJson());
        $this->assertSame($reviews, DB::table('cancellation_reviews')->orderBy('id')->get()->toJson());
        $this->assertSame($activity, DB::table('activity_log')->count());

        // La exportación conserva la auditoría propia de api-022 (CA-21) y no toca revisiones ni boletos.
        $this->actAs($admin)->get(self::URL.'/export?'.self::RANGE.'&format=csv')->assertOk();
        $this->assertSame($tickets, DB::table('tickets')->orderBy('id')->get()->toJson());
        $this->assertSame($reviews, DB::table('cancellation_reviews')->orderBy('id')->get()->toJson());
        $this->assertSame($activity + 1, DB::table('activity_log')->count());
        $this->assertSame($reviewEvents, $this->activityCount('cashier-day-reviewed'));
    }
}
