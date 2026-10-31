<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Animal;
use App\Models\Species;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnimalController extends Controller
{
    private const SEX = [
        'hembra' => 'F',
        'macho' => 'M',
        'unknown' => 'I',
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
                'animals.age',
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'species' => ['required', 'string', 'max:100'],
            'tag_number' => ['required', 'string', 'max:50', 'unique:animals,tag_number'],
            'sex' => ['required', 'in:hembra,macho,unknown'],
            'birth_date' => ['nullable', 'date'],
            'origin' => ['nullable', 'in:rescue,birth,transfer'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $origins = [
            'rescue' => 'Rescate',
            'birth' => 'Nacido en el zoológico',
            'transfer' => 'Traslado',
        ];

        $animal = DB::transaction(function () use ($data, $request, $origins) {
            $species = Species::firstOrCreate(
                ['common_name' => $data['species']],
                ['scientific_name' => $data['species']],
            );

            return Animal::create([
                'tag_number' => $data['tag_number'],
                'responsible_id' => $request->user()->id,
                'name' => $data['name'],
                'sex' => self::SEX[$data['sex']],
                'age' => isset($data['birth_date']) ? 'Nacimiento: '.$data['birth_date'] : null,
                'origin' => isset($data['origin']) ? $origins[$data['origin']] : null,
                'characteristics' => $data['notes'] ?? null,
                'entry_date' => now()->toDateString(),
                'species_id' => $species->id,
                'stay_status' => 'Cuarentena_Ingreso',
            ]);
        });

        return response()->json(['data' => [
            'id' => $animal->id,
            'tag_number' => $animal->tag_number,
            'name' => $animal->name,
            'species' => $data['species'],
            'sex' => $animal->sex,
            'age' => $animal->age,
            'stay_status' => $animal->stay_status,
        ]], 201);
    }
}
