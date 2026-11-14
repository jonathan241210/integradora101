<?php

namespace Tests\Feature\Memories;

use App\Http\Controllers\Visitor\VisitorMemoryController;
use App\Http\Middleware\EnsureVisitorEmailVerified;
use Illuminate\Support\Facades\Route;
use ReflectionClass;
use Tests\TestCase;

class MemoriesRoutesTest extends TestCase
{
    /** CA-21 */
    public function test_ca21_review_routes_have_english_names(): void
    {
        foreach (['index', 'show', 'image', 'accept', 'reject'] as $name) {
            $this->assertTrue(Route::has("admin.memories.{$name}"), "admin.memories.{$name}");
        }
    }

    /** CA-21 */
    public function test_ca21_visitor_memory_routes_are_named_and_controllers_are_thin(): void
    {
        $expected = [
            'visitor.memories.store' => ['POST', 'api/v1/visitor/memories', 'store'],
            'visitor.memories.index' => ['GET', 'api/v1/visitor/memories', 'index'],
            'visitor.memories.resubmit' => ['POST', 'api/v1/visitor/memories/{id}/resubmit', 'resubmit'],
        ];

        foreach ($expected as $name => [$method, $uri, $action]) {
            $this->assertTrue(Route::has($name), $name);
            $route = Route::getRoutes()->getByName($name);
            $this->assertContains($method, $route->methods());
            $this->assertSame($uri, $route->uri());
            $this->assertSame(VisitorMemoryController::class.'@'.$action, $route->getActionName());

            $middleware = $route->gatherMiddleware();
            $this->assertContains('auth:sanctum', $middleware);
            $this->assertContains('visitor.token', $middleware);
            $this->assertContains(EnsureVisitorEmailVerified::class, $middleware);
        }

        // Controlador delgado: solo Form Requests, Actions y Resources; sin acceso a datos ni a archivos.
        $source = file_get_contents((new ReflectionClass(VisitorMemoryController::class))->getFileName());
        foreach (['SubmitVisitorMemoryAction', 'ListVisitorMemoriesAction', 'ResubmitVisitorMemoryAction', 'StoreVisitorMemoryRequest', 'ResubmitVisitorMemoryRequest', 'VisitorMemoryResource'] as $collaborator) {
            $this->assertStringContainsString($collaborator, $source);
        }
        foreach (['DB::', 'Storage::', '::query(', '->save(', 'Model', 'Carbon', 'config('] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $source, "El controlador no debe contener {$forbidden}");
        }
        $this->assertLessThan(60, substr_count($source, "\n"));

        foreach (['SubmitVisitorMemoryAction', 'ListVisitorMemoriesAction', 'ResubmitVisitorMemoryAction'] as $action) {
            $this->assertTrue(class_exists("App\\Actions\\Memories\\Visitor\\{$action}"), $action);
        }
    }
}
