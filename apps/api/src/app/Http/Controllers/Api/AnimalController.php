<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\ClinicalEvaluation;
use App\Models\Species;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AnimalController extends Controller
{
    private const SEX = [
        'hembra' => 'F',
        'macho' => 'M',
    ];

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

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
            ])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->where(fn ($inner) => $inner
                    ->where('animals.name', 'like', $like)
                    ->orWhere('animals.tag_number', 'like', $like)
                    ->orWhere('species.common_name', 'like', $like));
            })
            ->orderBy('animals.name')
            ->limit(200)
            ->get();

        return response()->json(['data' => $animals]);
    }

    public function show(Animal $animal): JsonResponse
    {
        $animal->load([
            'species:id,common_name,scientific_name,category,conservation_status,habitat,feeding,longevity,reproduction,gestation_period,size_cm,model_3d_path',
            'enclosure:id,name',
        ]);

        $evaluations = ClinicalEvaluation::query()
            ->where('animal_id', $animal->id)
            ->leftJoin('users', 'users.id', '=', 'clinical_evaluations.veterinarian_id')
            ->select('clinical_evaluations.*', DB::raw("concat_ws(' ', users.first_name, users.last_name, users.second_last_name) as veterinarian"))
            ->with(['findings', 'restraints', 'labSamples'])
            ->orderByDesc('evaluation_date')
            ->orderByDesc('clinical_evaluations.id')
            ->get();

        return response()->json(['data' => [
            'id' => $animal->id,
            'tag_number' => $animal->tag_number,
            'name' => $animal->name,
            'sex' => $animal->sex,
            'birth_date' => $animal->birth_date?->format('Y-m-d'),
            'origin' => $animal->origin,
            'characteristics' => $animal->characteristics,
            'entry_date' => $animal->entry_date?->format('Y-m-d'),
            'stay_status' => $animal->stay_status,
            'species' => $animal->species,
            'enclosure' => $animal->enclosure?->name,
            'evaluations' => $evaluations,
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'species_id' => ['nullable', 'integer', 'exists:species,id'],
            'species' => ['nullable', 'string', 'max:100'],
            'tag_number' => ['required', 'string', 'max:50', 'unique:animals,tag_number'],
            'enclosure_id' => ['required', 'integer', 'exists:enclosures,id'],
            'sex' => ['required', Rule::in(['hembra', 'macho'])],
            'birth_date' => ['nullable', 'date'],
            'origin' => ['nullable', 'in:rescue,birth,transfer'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ], [
            'enclosure_id.required' => 'Selecciona un recinto.',
            'enclosure_id.exists' => 'El recinto seleccionado no existe.',
            'sex.in' => 'Selecciona un sexo válido.',
        ]);

        $speciesName = isset($data['species']) ? trim($data['species']) : '';
        $hasSpeciesId = ! empty($data['species_id']);
        $hasSpeciesName = $speciesName !== '';

        if (! $hasSpeciesId && ! $hasSpeciesName) {
            return response()->json([
                'message' => 'Selecciona una especie existente o ingresa el nombre de una nueva.',
                'errors' => ['species' => ['Selecciona una especie existente o ingresa el nombre de una nueva.']],
            ], 422);
        }

        $origins = [
            'rescue' => 'Rescate',
            'birth' => 'Nacido en el zoológico',
            'transfer' => 'Traslado',
        ];

        $animal = DB::transaction(function () use ($data, $request, $origins, $hasSpeciesId, $speciesName) {
            if ($hasSpeciesId) {
                $species = Species::query()->findOrFail((int) $data['species_id']);
            } else {
                $species = Species::firstOrCreate(
                    ['common_name' => $speciesName],
                    ['scientific_name' => $speciesName],
                );
            }

            return Animal::create([
                'tag_number' => $data['tag_number'],
                'responsible_id' => $request->user()->id,
                'name' => $data['name'],
                'sex' => self::SEX[$data['sex']],
                'birth_date' => $data['birth_date'] ?? null,
                'origin' => isset($data['origin']) ? $origins[$data['origin']] : null,
                'characteristics' => $data['notes'] ?? null,
                'entry_date' => now()->toDateString(),
                'enclosure_id' => $data['enclosure_id'],
                'species_id' => $species->id,
                'stay_status' => 'Cuarentena_Ingreso',
            ]);
        });

        $animal->load('species:id,common_name');

        return response()->json(['data' => [
            'id' => $animal->id,
            'tag_number' => $animal->tag_number,
            'name' => $animal->name,
            'species' => $animal->species?->common_name,
            'sex' => $animal->sex,
            'birth_date' => $animal->birth_date?->format('Y-m-d'),
            'stay_status' => $animal->stay_status,
        ]], 201);
    }
}
