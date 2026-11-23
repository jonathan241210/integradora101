<?php

namespace Tests\Feature\Console;

use App\Actions\Admin\Reports\BuildCancellationTrafficLightAction;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

/** api-027: comando de datos de demostración (solo arca_pruebas). Dentro de la transacción de cada prueba. */
class DemoCancellationReviewsCommandTest extends FeatureTestCase
{
    use CreatesAdministrators;

    private const COMMAND = 'arca:demo:cancellation-reviews';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        config(['arca.demo_staff_password' => 'Demo-Passw0rd!2026']);
    }

    /** @return array{users: int, tickets: int, activity: int} */
    private function counts(): array
    {
        return [
            'users' => DB::table('users')->where('email', 'like', 'demo-cancel-%@arca.local')->count(),
            'tickets' => DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->count(),
            'activity' => DB::table('activity_log')->where('event', 'ticket-cancelled')->whereJsonContains('properties->demo', true)->count(),
        ];
    }

    private function demoTickets(): string
    {
        return DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->orderBy('id')->get()->toJson();
    }

    /** CA-29 cancellation-review-signals */
    public function test_ca29_demo_command_refuses_other_database_or_production(): void
    {
        $before = $this->counts();
        $ticketsBefore = DB::table('tickets')->count();
        $usersBefore = DB::table('users')->count();

        // Otra base distinta de arca_pruebas.
        $connection = config('database.default');
        $original = config("database.connections.{$connection}.database");
        config(["database.connections.{$connection}.database" => 'arca_zoo']);
        $this->artisan(self::COMMAND)->assertExitCode(1);
        config(["database.connections.{$connection}.database" => $original]);

        $this->assertSame($before, $this->counts());
        $this->assertSame($ticketsBefore, DB::table('tickets')->count());
        $this->assertSame($usersBefore, DB::table('users')->count());

        // APP_ENV = production.
        $this->app['env'] = 'production';
        $this->artisan(self::COMMAND)->assertExitCode(1);
        $this->app['env'] = 'testing';

        $this->assertSame($before, $this->counts());
        $this->assertSame($ticketsBefore, DB::table('tickets')->count());
        $this->assertSame($usersBefore, DB::table('users')->count());

        // Con la base y el entorno correctos sí corre.
        $this->artisan(self::COMMAND, ['--days' => 2])->assertExitCode(0);

        // --days inválido no escribe.
        $this->artisan(self::COMMAND, ['--days' => 0])->assertExitCode(1);
        $this->artisan(self::COMMAND, ['--days' => 'abc'])->assertExitCode(1);
    }

    /** CA-30 cancellation-review-signals */
    public function test_ca30_demo_command_is_idempotent(): void
    {
        $this->artisan(self::COMMAND, ['--days' => 7])->assertExitCode(0);
        $first = $this->counts();
        $snapshot = $this->demoTickets();

        $this->assertSame(3, $first['users']);
        $this->assertGreaterThan(0, $first['tickets']);
        $this->assertGreaterThan(0, $first['activity']);
        // Cada cajero de demostración tiene el rol cashier y correo @arca.local.
        $this->assertSame(3, DB::table('model_has_roles')->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('users', 'users.id', '=', 'model_has_roles.model_id')
            ->where('roles.name', 'cashier')->where('users.email', 'like', 'demo-cancel-%@arca.local')->count());

        $this->artisan(self::COMMAND, ['--days' => 7])->assertExitCode(0);

        $this->assertSame($first, $this->counts());
        $this->assertSame($snapshot, $this->demoTickets());
        $this->assertSame(
            DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->count(),
            DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->distinct()->count('qr_code'),
        );
    }

    /** CA-31 cancellation-review-signals */
    public function test_ca31_demo_data_covers_all_three_levels(): void
    {
        // arca_pruebas conserva datos reales y demo: se mueve el reloj a una fecha sin datos y se vacía la ventana de
        // histórico y compañeros (28 + 7 días) para que solo cuente lo que genera el comando.
        $this->travelTo(now()->addYears(5));
        $today = CarbonImmutable::now(config('arca.timezone'));
        $this->assertGreaterThan(0, DB::transactionLevel());
        DB::table('tickets')
            ->where('purchased_at', '>=', $today->subDays(35)->startOfDay()->utc())
            ->delete();

        $this->artisan(self::COMMAND, ['--days' => 7])->assertExitCode(0);

        $rows = app(BuildCancellationTrafficLightAction::class)->execute($today->subDays(6)->toDateString(), $today->toDateString());
        $demoIds = DB::table('users')->where('email', 'like', 'demo-cancel-%@arca.local')->pluck('id')->all();
        $levels = collect($rows)->filter(fn ($r) => in_array($r['cashier_id'], $demoIds, true))->pluck('traffic_light')->unique()->all();

        foreach (['normal', 'review', 'attention'] as $level) {
            $this->assertContains($level, $levels, "Falta un cajero-día demo en nivel {$level}.");
        }
    }

    /** CA-32 cancellation-review-signals */
    public function test_ca32_demo_extends_days_without_changing_existing_rows(): void
    {
        // arca_pruebas ya conserva datos demo reales (decisión de Jonathan, 2026-11-21): se mueve el
        // reloj a fechas sin demo para que el test no dependa de lo ya cargado.
        $this->travelTo(now()->addYears(3));

        $this->artisan(self::COMMAND, ['--days' => 3])->assertExitCode(0);
        $snapshot = DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->orderBy('id')->get()->keyBy('id');
        $count = $snapshot->count();
        $this->assertGreaterThan(0, $count);

        $this->artisan(self::COMMAND, ['--days' => 7])->assertExitCode(0);

        $after = DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->orderBy('id')->get()->keyBy('id');
        $this->assertGreaterThan($count, $after->count());
        foreach ($snapshot as $id => $row) {
            $this->assertEquals($row, $after[$id], "El boleto demo {$id} no debe cambiar.");
        }

        // Nada de lo creado cae en el futuro ni fuera de la zona de negocio de hoy.
        $this->assertSame(0, DB::table('tickets')->where('qr_code', 'like', 'DEMO-CANCEL-%')->where('purchased_at', '>', now()->utc())->count());
    }

    /** CA-30 cancellation-review-signals (T-23: sin borrado físico en el comando) */
    public function test_ca30_demo_command_has_no_delete_statements(): void
    {
        foreach (['Console/Commands/DemoCancellationReviewsCommand.php', 'Actions/Demo/SeedCancellationReviewDemoAction.php'] as $file) {
            $this->assertDoesNotMatchRegularExpression('/delete|truncate|forceDelete/i', file_get_contents(app_path($file)), $file);
        }
    }
}
