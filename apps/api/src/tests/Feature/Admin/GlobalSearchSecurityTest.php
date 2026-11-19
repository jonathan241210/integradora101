<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchSecurityTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures;
    use BuildsSearchFixtures;

    /** CA-48 enclosure-status-and-global-search */
    public function test_ca48_no_secret_fields_or_extra_keys(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $user = $this->createAccount('executive', true, ['first_name' => 'Secreto'.$tag]);
        $secrets = ['remember_token' => 'tok'.$this->tag(), 'two_factor_secret' => 'tfs'.$this->tag(), 'two_factor_recovery_codes' => 'rec'.$this->tag()];
        DB::table('users')->where('id', $user->id)->update($secrets);
        $hash = (string) DB::table('users')->where('id', $user->id)->value('password');
        $imageTag = $this->tag();
        $this->makeSpeciesId(['common_name' => 'Imagen '.$tag, 'is_published' => 1, 'image_path' => 'species/'.$imageTag.'.jpg']);
        $this->makeMemory('in_review', false, 'Opinión '.$tag, ['image_path' => 'memories/'.$imageTag.'.jpg']);
        $this->makeTicket('completed', '2032-01-01 10:00:00', false, ['qr_code' => 'QR-'.$imageTag]);

        // Buscar un hash, un token o una ruta de imagen no devuelve resultados.
        foreach ([$hash, ...array_values($secrets), $imageTag, 'QR-'.$imageTag] as $needle) {
            $this->search($admin, $needle)->assertOk()->assertExactJson(['groups' => []]);
        }

        $response = $this->search($admin, $tag)->assertOk();
        $body = $response->getContent();
        foreach (['password', 'remember_token', 'two_factor', 'qr_code', 'image_sha256', 'image_path', 'visitor', $imageTag] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $body, $forbidden);
        }
        foreach ($response->json('groups') as $group) {
            foreach ($group['items'] as $item) {
                $allowed = $group['section'] === 'tulanpedia' ? ['id', 'title', 'subtitle', 'kind', 'match'] : ['id', 'title', 'subtitle', 'match'];
                $this->assertEmpty(array_diff(array_keys($item), $allowed));
            }
        }
    }

    /** CA-49 enclosure-status-and-global-search */
    public function test_ca49_term_not_logged_nor_audited(): void
    {
        $admin = $this->searchAdmin();
        $term = $this->tag();
        $this->makeEnclosure(['name' => 'Registro '.$term]);
        $before = DB::table('activity_log')->count();

        Log::spy();
        $this->search($admin, $term)->assertOk();

        foreach (['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency', 'log'] as $level) {
            Log::shouldNotHaveReceived($level);
        }
        $this->assertSame($before, DB::table('activity_log')->count());
        $this->assertSame(0, DB::table('activity_log')->where('description', 'like', '%'.$term.'%')->orWhere('properties', 'like', '%'.$term.'%')->count());
    }
}
