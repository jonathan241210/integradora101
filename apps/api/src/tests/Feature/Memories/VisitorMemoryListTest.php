<?php

namespace Tests\Feature\Memories;

use App\Models\VisitorMemory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\CreatesMemoryFixtures;
use Tests\Concerns\InteractsWithVisitorMemories;
use Tests\Feature\Visitor\VisitorFeatureTestCase;

class VisitorMemoryListTest extends VisitorFeatureTestCase
{
    use CreatesAdministrators;
    use CreatesMemoryFixtures;
    use InteractsWithVisitorMemories;

    private function list(string $token)
    {
        return $this->withVisitorToken($token)->getJson('/api/v1/visitor/memories');
    }

    /** CA-06 */
    public function test_ca06_list_only_own_newest_first_max_50_with_meta(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        [, $other] = $this->memoryVisitor();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);

        $this->list($token)->assertOk()
            ->assertExactJson(['data' => [], 'meta' => ['can_submit' => true, 'next_submission_at' => null, 'open_request_id' => null]]);

        $this->memoryOf($other, 'submitted');
        $old = $this->memoryOf($visitor, 'accepted', [], $now->copy()->subDays(20));
        $new = $this->memoryOf($visitor, 'accepted', [], $now->copy()->subDays(10));

        $response = $this->list($token)->assertOk();
        $this->assertSame([$new->id, $old->id], array_column($response->json('data'), 'id'));
        $response->assertJsonPath('meta.can_submit', true)->assertJsonPath('meta.next_submission_at', null);

        $bulk = DB::table('visitor_memories');
        $rows = [];
        for ($i = 0; $i < 52; $i++) {
            $rows[] = [
                'visitor_id' => $visitor->id, 'status' => 'accepted', 'opinion' => null,
                'image_path' => 'memories/'.fake()->uuid().'.jpg', 'image_sha256' => hash('sha256', (string) $i),
                'consent_at' => $now, 'terms_version' => 'v1', 'resubmitted_count' => 0,
                'created_at' => $now->copy()->subDays(40)->subMinutes($i), 'updated_at' => $now,
            ];
        }
        $bulk->insert($rows);

        $data = $this->list($token)->assertOk()->json('data');
        $this->assertCount(50, $data);
        $this->assertSame($new->id, $data[0]['id']);
        $this->assertSame($old->id, $data[1]['id']);
    }

    /** CA-06 */
    public function test_ca06_meta_reports_open_request_and_next_submission(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);

        $open = $this->memoryOf($visitor, 'rejected', ['rejection_reason' => 'Foto borrosa', 'rejected_image' => true], $now->copy()->subDays(2));

        $this->list($token)->assertOk()
            ->assertJsonPath('meta.can_submit', false)
            ->assertJsonPath('meta.open_request_id', $open->id)
            ->assertJsonPath('meta.next_submission_at', $now->copy()->subDays(2)->addDays(7)->utc()->toIso8601String());
    }

    /** CA-06 */
    public function test_ca06_rejected_and_accepted_fields_and_no_reviewer_data(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $staff = $this->createMemoryStaff();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);

        $rejected = $this->memoryOf($visitor, 'rejected', [
            'rejection_reason' => 'Foto borrosa', 'rejected_image' => true, 'rejected_content' => true,
            'reviewed_by' => $staff->id, 'reviewed_at' => $now,
        ], $now->copy()->subDays(20));
        $accepted = $this->memoryOf($visitor, 'accepted', [
            'reviewed_by' => $staff->id, 'reviewed_at' => $now, 'published_at' => $now,
            'published_until' => $now->copy()->addDays(3), 'published_image_path' => 'memories/'.fake()->uuid().'.jpg',
        ], $now->copy()->subDays(10));
        $submitted = $this->memoryOf($visitor, 'submitted', [], $now->copy()->subDays(1));

        $data = collect($this->list($token)->assertOk()->json('data'))->keyBy('id');

        $this->assertSame('Foto borrosa', $data[$rejected->id]['rejection_reason']);
        $this->assertSame(['image', 'content'], $data[$rejected->id]['rejected_fields']);
        $this->assertTrue($data[$accepted->id]['is_published']);
        $this->assertSame($now->copy()->addDays(3)->toIso8601String(), $data[$accepted->id]['published_until']);
        $this->assertArrayNotHasKey('rejection_reason', $data[$accepted->id]);
        $this->assertArrayNotHasKey('published_until', $data[$submitted->id]);
        $this->assertArrayNotHasKey('rejected_fields', $data[$submitted->id]);

        $allowed = ['id', 'status', 'opinion', 'created_at', 'reviewed_at', 'resubmitted_count', 'rejection_reason', 'rejected_fields', 'published_until', 'is_published'];
        foreach ($data as $row) {
            $this->assertSame([], array_diff(array_keys($row), $allowed));
        }
    }

    /** CA-31 */
    public function test_ca31_visitor_sees_is_published_false_after_expiry(): void
    {
        [$token, $visitor] = $this->memoryVisitor();
        $now = Carbon::now()->startOfSecond();
        Carbon::setTestNow($now);

        $expired = $this->memoryOf($visitor, 'accepted', ['published_at' => $now->copy()->subDays(8), 'published_until' => $now->copy()->subSecond()], $now->copy()->subDays(9));
        $edge = $this->memoryOf($visitor, 'accepted', ['published_at' => $now->copy()->subDays(7), 'published_until' => $now], $now->copy()->subDays(8));

        $data = collect($this->list($token)->assertOk()->json('data'))->keyBy('id');

        foreach ([$expired, $edge] as $memory) {
            $this->assertSame('accepted', $data[$memory->id]['status']);
            $this->assertFalse($data[$memory->id]['is_published']);
            $this->assertNotNull($data[$memory->id]['published_until']);
        }
        $this->assertSame(2, VisitorMemory::query()->where('visitor_id', $visitor->id)->count());
    }
}
