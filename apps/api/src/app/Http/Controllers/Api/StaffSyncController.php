<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\Enclosure;
use App\Models\Species;
use App\Models\SyncOperation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class StaffSyncController extends Controller
{
    private const SEX = [
        'hembra' => 'F',
        'macho' => 'M',
    ];

    public function bootstrap(Request $request): JsonResponse
    {
        $user = $request->user();

        $animals = Animal::query()
            ->leftJoin('species', 'species.id', '=', 'animals.species_id')
            ->select([
                'animals.id',
                'animals.tag_number',
                'animals.name',
                'animals.sex',
                'animals.birth_date',
                'animals.stay_status',
                'species.common_name as species',
                'animals.updated_at',
                'animals.deleted_at',
            ])
            ->orderBy('animals.id')
            ->get();

        $enclosures = Enclosure::query()
            ->select(['id', 'name', 'updated_at', 'deleted_at'])
            ->orderBy('id')
            ->get();

        $speciesSelect = ['id', 'common_name'];
        $speciesHasUpdated = Schema::hasColumn('species', 'updated_at');
        $speciesHasDeleted = Schema::hasColumn('species', 'deleted_at');
        if ($speciesHasUpdated) {
            $speciesSelect[] = 'updated_at';
        }
        if ($speciesHasDeleted) {
            $speciesSelect[] = 'deleted_at';
        }

        $speciesQuery = Species::query();
        if ($speciesHasDeleted) {
            $speciesQuery->withTrashed();
        }
        $species = $speciesQuery
            ->select($speciesSelect)
            ->orderBy('id')
            ->get();

        $cursor = now()->toIso8601String();

        return response()->json([
            'data' => [
                'profile' => [
                    'id' => $user->id,
                    'name' => trim(implode(' ', array_filter([
                        $user->first_name ?? null,
                        $user->last_name ?? null,
                        $user->second_last_name ?? null,
                    ]))) ?: ($user->name ?? ''),
                ],
                'animals' => $animals,
                'enclosures' => $enclosures,
                'species' => $species,
                'cursor' => $cursor,
                'server_time' => $cursor,
            ],
        ]);
    }

    public function changes(Request $request): JsonResponse
    {
        $request->validate([
            'cursor' => ['nullable', 'string'],
            'since' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $sinceRaw = $request->query('since') ?? $request->query('cursor');
        $since = $sinceRaw ? Carbon::parse($sinceRaw) : Carbon::create(1970, 1, 1);
        $limit = (int) ($request->query('limit', 200));

        $animals = Animal::withTrashed()
            ->leftJoin('species', 'species.id', '=', 'animals.species_id')
            ->select([
                'animals.id',
                'animals.tag_number',
                'animals.name',
                'animals.sex',
                'animals.birth_date',
                'animals.stay_status',
                'species.common_name as species',
                'animals.updated_at',
                'animals.deleted_at',
            ])
            ->where(function ($q) use ($since) {
                $q->where('animals.updated_at', '>', $since)
                    ->orWhere('animals.deleted_at', '>', $since);
            })
            ->orderBy('animals.updated_at')
            ->orderBy('animals.id')
            ->limit($limit + 1)
            ->get();

        $enclosures = Enclosure::withTrashed()
            ->select(['id', 'name', 'updated_at', 'deleted_at'])
            ->where(function ($q) use ($since) {
                $q->where('updated_at', '>', $since)
                    ->orWhere('deleted_at', '>', $since);
            })
            ->orderBy('updated_at')
            ->orderBy('id')
            ->limit($limit + 1)
            ->get();

        $speciesSelect = ['id', 'common_name'];
        $speciesHasUpdated = Schema::hasColumn('species', 'updated_at');
        $speciesHasDeleted = Schema::hasColumn('species', 'deleted_at');
        if ($speciesHasUpdated) {
            $speciesSelect[] = 'updated_at';
        }
        if ($speciesHasDeleted) {
            $speciesSelect[] = 'deleted_at';
        }

        $speciesQuery = Species::query();
        if ($speciesHasDeleted) {
            $speciesQuery->withTrashed();
        }
        $speciesQuery->select($speciesSelect);
        if ($speciesHasUpdated || $speciesHasDeleted) {
            $speciesQuery->where(function ($q) use ($since, $speciesHasUpdated, $speciesHasDeleted) {
                if ($speciesHasUpdated) {
                    $q->where('updated_at', '>', $since);
                }
                if ($speciesHasDeleted) {
                    $speciesHasUpdated ? $q->orWhere('deleted_at', '>', $since) : $q->where('deleted_at', '>', $since);
                }
            });
        }
        if ($speciesHasUpdated) {
            $speciesQuery->orderBy('updated_at')->orderBy('id');
        } else {
            $speciesQuery->orderBy('id');
        }
        $species = $speciesQuery->limit($limit + 1)->get();

        $hasMore = $animals->count() > $limit || $enclosures->count() > $limit || $species->count() > $limit;
        $animals = $animals->take($limit)->values();
        $enclosures = $enclosures->take($limit)->values();
        $species = $species->take($limit)->values();

        $cursor = now()->toIso8601String();

        return response()->json([
            'data' => [
                'animals' => $animals,
                'enclosures' => $enclosures,
                'species' => $species,
                'cursor' => $cursor,
                'has_more' => $hasMore,
            ],
        ]);
    }

    public function operations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'operations' => ['required', 'array', 'min:1'],
            'operations.*.operation_uuid' => ['required', 'uuid'],
            'operations.*.entity_type' => ['required', 'string', 'in:animal,clinical_evaluation'],
            'operations.*.client_entity_id' => ['nullable', 'uuid'],
            'operations.*.depends_on_client_entity_id' => ['nullable', 'uuid'],
            'operations.*.payload' => ['required', 'array'],
        ]);

        $user = $request->user();
        $results = [];

        foreach ($validated['operations'] as $operation) {
            $results[] = $this->processOperation($user->id, $operation);
        }

        return response()->json(['data' => ['results' => $results]]);
    }

    /**
     * @param  array{operation_uuid:string,entity_type:string,client_entity_id?:string|null,depends_on_client_entity_id?:string|null,payload:array}  $operation
     * @return array<string,mixed>
     */
    private function processOperation(int $userId, array $operation): array
    {
        $uuid = $operation['operation_uuid'];

        $existing = SyncOperation::query()->where('operation_uuid', $uuid)->first();
        if ($existing) {
            return $this->resultFromOperation($existing, $existing->status === 'completed' ? 'duplicate' : $existing->status);
        }

        try {
            return DB::transaction(function () use ($userId, $operation, $uuid) {
                // Re-chequeo dentro de transacción por concurrencia
                $existing = SyncOperation::query()->where('operation_uuid', $uuid)->lockForUpdate()->first();
                if ($existing) {
                    return $this->resultFromOperation($existing, $existing->status === 'completed' ? 'duplicate' : $existing->status);
                }

                if ($operation['entity_type'] === 'animal') {
                    return $this->processAnimalOperation($userId, $operation);
                }

                if ($operation['entity_type'] === 'clinical_evaluation') {
                    return $this->processEvaluationOperation($userId, $operation);
                }

                return $this->recordRejected($userId, $operation, 'unsupported_entity', 'Tipo de operación no soportado.');
            });
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'Los datos enviados no son válidos.';

            return $this->recordRejected($userId, $operation, 'validation_error', $message);
        } catch (\Throwable $e) {
            return $this->recordRejected($userId, $operation, 'processing_error', 'No se pudo procesar la operación. Inténtalo de nuevo.');
        }
    }

    /**
     * @param  array<string,mixed>  $operation
     * @return array<string,mixed>
     */
    private function processAnimalOperation(int $userId, array $operation): array
    {
        $payload = $operation['payload'] ?? [];

        $data = validator($payload, [
            'name' => ['required', 'string', 'max:100'],
            'species_id' => ['nullable', 'integer', 'exists:species,id'],
            'species' => ['nullable', 'string', 'max:100'],
            'tag_number' => ['required', 'string', 'max:50', 'unique:animals,tag_number'],
            'enclosure_id' => ['required', 'integer', 'exists:enclosures,id'],
            'sex' => ['required', Rule::in(['hembra', 'macho', 'F', 'M'])],
            'birth_date' => ['nullable', 'date'],
            'origin' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'characteristics' => ['nullable', 'string', 'max:5000'],
        ], [
            'enclosure_id.required' => 'Selecciona un recinto.',
            'enclosure_id.exists' => 'El recinto seleccionado no existe.',
            'sex.in' => 'Selecciona un sexo válido.',
            'tag_number.unique' => 'La identificación ya está registrada.',
        ])->validate();

        $speciesName = isset($data['species']) ? trim((string) $data['species']) : '';
        $hasSpeciesId = ! empty($data['species_id']);
        $hasSpeciesName = $speciesName !== '';
        if (! $hasSpeciesId && ! $hasSpeciesName) {
            throw ValidationException::withMessages([
                'species' => ['Selecciona una especie existente o ingresa el nombre de una nueva.'],
            ]);
        }

        $origins = [
            'rescue' => 'Rescate',
            'birth' => 'Nacido en el zoológico',
            'transfer' => 'Traslado',
        ];

        if ($hasSpeciesId) {
            $species = Species::query()->findOrFail((int) $data['species_id']);
        } else {
            $species = Species::firstOrCreate(
                ['common_name' => $speciesName],
                ['scientific_name' => $speciesName],
            );
        }

        $sex = $data['sex'];
        if ($sex === 'hembra') {
            $sex = 'F';
        }
        if ($sex === 'macho') {
            $sex = 'M';
        }

        $origin = $data['origin'] ?? null;
        if ($origin !== null && isset($origins[$origin])) {
            $origin = $origins[$origin];
        }

        $animal = Animal::create([
            'tag_number' => $data['tag_number'],
            'responsible_id' => $userId,
            'name' => $data['name'],
            'sex' => $sex,
            'birth_date' => $data['birth_date'] ?? null,
            'origin' => $origin,
            'characteristics' => $data['notes'] ?? ($data['characteristics'] ?? null),
            'entry_date' => now()->toDateString(),
            'enclosure_id' => $data['enclosure_id'],
            'species_id' => $species->id,
            'stay_status' => 'Cuarentena_Ingreso',
        ]);

        $op = SyncOperation::create([
            'operation_uuid' => $operation['operation_uuid'],
            'user_id' => $userId,
            'entity_type' => 'animal',
            'client_entity_id' => $operation['client_entity_id'] ?? null,
            'server_entity_type' => 'animal',
            'server_entity_id' => $animal->id,
            'status' => 'completed',
            'processed_at' => now(),
        ]);

        return $this->resultFromOperation($op, 'completed');
    }

    /**
     * @param  array<string,mixed>  $operation
     * @return array<string,mixed>
     */
    private function processEvaluationOperation(int $userId, array $operation): array
    {
        $payload = $operation['payload'] ?? [];
        $kind = $payload['kind'] ?? null;
        $animalServerId = $payload['animal_id'] ?? $payload['animal_server_id'] ?? null;
        $data = $payload['data'] ?? null;

        // Resolver dependencia de animal local si aplica
        if (empty($animalServerId) && ! empty($operation['depends_on_client_entity_id'])) {
            $parent = SyncOperation::query()
                ->where('user_id', $userId)
                ->where('client_entity_id', $operation['depends_on_client_entity_id'])
                ->where('entity_type', 'animal')
                ->where('status', 'completed')
                ->first();
            if ($parent && $parent->server_entity_id) {
                $animalServerId = $parent->server_entity_id;
            }
        }
        if (empty($animalServerId) && ! empty($payload['animal_local_id'])) {
            $parent = SyncOperation::query()
                ->where('user_id', $userId)
                ->where('client_entity_id', $payload['animal_local_id'])
                ->where('entity_type', 'animal')
                ->where('status', 'completed')
                ->first();
            if ($parent && $parent->server_entity_id) {
                $animalServerId = $parent->server_entity_id;
            }
        }

        if (! in_array($kind, ['intense', 'quick', 'review'], true)) {
            return $this->recordRejected($userId, $operation, 'validation_error', 'El tipo de evaluación no es válido.');
        }
        if (empty($animalServerId) || ! Animal::withTrashed()->whereKey($animalServerId)->exists()) {
            return $this->recordRejected($userId, $operation, 'validation_error', 'Selecciona un animal válido para el diagnóstico.');
        }
        if (! is_array($data)) {
            return $this->recordRejected($userId, $operation, 'validation_error', 'Los datos de la evaluación no son válidos.');
        }

        $controller = app(ClinicalEvaluationController::class);

        // Reutiliza la lógica existente de creación delegando por kind (métodos privados no accesibles),
        // así que replicamos la validación/persistencia mínima vía request interno.
        $request = Request::create('/api/v1/staff/clinical-evaluations', 'POST', [
            'kind' => $kind,
            'animal_id' => (int) $animalServerId,
            'data' => array_map(fn ($v) => is_string($v) ? $v : (is_scalar($v) ? (string) $v : $v), $data),
        ]);
        $request->setUserResolver(fn () => User::find($userId));

        try {
            $response = $controller->store($request);
            $json = $response->getData(true);
            $serverId = $json['data']['id'] ?? null;
            $op = SyncOperation::create([
                'operation_uuid' => $operation['operation_uuid'],
                'user_id' => $userId,
                'entity_type' => 'clinical_evaluation',
                'client_entity_id' => $operation['client_entity_id'] ?? null,
                'server_entity_type' => 'clinical_evaluation',
                'server_entity_id' => $serverId,
                'status' => 'completed',
                'processed_at' => now(),
            ]);

            return $this->resultFromOperation($op, 'completed');
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'Los datos de la evaluación no son válidos.';

            return $this->recordRejected($userId, $operation, 'validation_error', $message);
        } catch (HttpException $e) {
            $message = $e->getMessage() ?: 'No se pudo guardar la evaluación.';
            if ($e->getStatusCode() === 422) {
                $content = json_decode((string) $e->getResponse()->getContent(), true);
                $message = $content['message'] ?? $message;
                $first = collect($content['errors'] ?? [])->flatten()->first();
                if ($first) {
                    $message = $first;
                }
            }
            $code = $e->getStatusCode() === 403 ? 'forbidden' : ($e->getStatusCode() === 422 ? 'validation_error' : 'processing_error');

            return $this->recordRejected($userId, $operation, $code, $message);
        }
    }

    private function resultFromOperation(SyncOperation $op, string $status): array
    {
        return [
            'operation_uuid' => $op->operation_uuid,
            'status' => $status,
            'entity_type' => $op->entity_type,
            'server_id' => $op->server_entity_id,
            'server_entity_type' => $op->server_entity_type,
            'error_code' => $op->error_code,
            'message' => $status === 'duplicate' ? 'Operación ya sincronizada anteriormente.' : $op->error_message,
        ];
    }

    /**
     * @param  array<string,mixed>  $operation
     */
    private function recordRejected(int $userId, array $operation, string $errorCode, string $message): array
    {
        $existing = SyncOperation::query()->where('operation_uuid', $operation['operation_uuid'])->first();
        if ($existing) {
            return $this->resultFromOperation($existing, $existing->status === 'completed' ? 'duplicate' : $existing->status);
        }

        $op = SyncOperation::create([
            'operation_uuid' => $operation['operation_uuid'],
            'user_id' => $userId,
            'entity_type' => $operation['entity_type'] ?? 'unknown',
            'client_entity_id' => $operation['client_entity_id'] ?? null,
            'server_entity_type' => null,
            'server_entity_id' => null,
            'status' => 'rejected',
            'error_code' => $errorCode,
            'error_message' => $message,
            'processed_at' => now(),
        ]);

        return [
            'operation_uuid' => $op->operation_uuid,
            'status' => 'rejected',
            'entity_type' => $op->entity_type,
            'server_id' => null,
            'server_entity_type' => null,
            'error_code' => $errorCode,
            'message' => $message,
        ];
    }
}
