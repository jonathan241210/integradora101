<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicalEvaluation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClinicalEvaluationController extends Controller
{
    private const QUICK_GROUPS = [
        'attitude', 'body-condition', 'eyes', 'ears', 'oral', 'digestive',
        'skin', 'cardiovascular', 'respiratory', 'musculoskeletal', 'urogenital',
    ];

    private const INTENSE_SYSTEMS = [
        'general-condition', 'skin', 'digestive', 'urogenital', 'senses',
        'musculoskeletal', 'lymph-nodes', 'cardiovascular', 'nervous',
        'respiratory', 'endocrine', 'eyes',
    ];

    private const SAMPLE_TYPES = ['blood', 'urine', 'feces', 'fluids', 'skin-scraping'];

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'kind' => ['required', 'in:intense,quick,review'],
            'animal_id' => ['required', 'integer', 'exists:animals,id'],
            'data' => ['required', 'array'],
        ]);

        $data = array_map(
            fn ($value) => is_string($value) ? trim($value) : $value,
            $payload['data'],
        );

        $evaluation = DB::transaction(function () use ($payload, $data, $request) {
            $base = [
                'animal_id' => $payload['animal_id'],
                'veterinarian_id' => $request->user()->id,
            ];

            return match ($payload['kind']) {
                'intense' => $this->storeIntense($base, $data),
                'quick' => $this->storeQuick($base, $data),
                'review' => $this->storeReview($base, $data),
            };
        });

        return response()->json(['data' => [
            'id' => $evaluation->id,
            'evaluation_type' => $evaluation->evaluation_type,
            'animal_id' => $evaluation->animal_id,
            'evaluation_date' => $evaluation->evaluation_date,
        ]], 201);
    }

    private function storeIntense(array $base, array $d): ClinicalEvaluation
    {
        $notes = array_filter([
            $this->text($d, 'intense-general-notes'),
            $this->labelled('Animales afectados', $this->text($d, 'intense-affected')),
            $this->labelled('MVZ', $this->text($d, 'intense-mvz')),
        ]);

        $evaluation = ClinicalEvaluation::create($base + [
            'evaluation_type' => 'Historia_Clinica_Completa',
            'evaluation_reason' => 'clinical_history',
            'assessment_reason' => $notes ? implode("\n", $notes) : null,
            'evaluation_date' => $this->date($d['intense-date'] ?? null),
            'temperature_c' => $this->number($d['intense-vital-temp'] ?? null),
            'heart_rate' => $this->integer($d['intense-vital-fc'] ?? null),
            'respiratory_rate' => $this->integer($d['intense-vital-fr'] ?? null),
            'capillary_refill_time' => $this->integer($d['intense-vital-tlc'] ?? null),
            'weight_kg' => $this->number($d['intense-weight'] ?? null),
            'body_condition_score' => $this->score($d['intense-vital-cc'] ?? null),
            'presumptive_diagnosis' => $this->text($d, 'intense-presumptive'),
            'definitive_diagnosis' => $this->text($d, 'intense-definitive'),
        ]);

        foreach (self::INTENSE_SYSTEMS as $system) {
            $value = $this->text($d, "intense-eval-{$system}");
            if ($value !== null) {
                $evaluation->findings()->create([
                    'organ_system' => $system,
                    'status' => 'recorded',
                    'description' => $value,
                ]);
            }
        }

        for ($row = 1; $row <= 12; $row++) {
            $drug = $this->text($d, "intense-restraint-{$row}-medication");
            $mgKg = $this->text($d, "intense-restraint-{$row}-dose-mg-kg");
            $ml = $this->text($d, "intense-restraint-{$row}-dose-ml");
            $time = $this->text($d, "intense-restraint-{$row}-time");
            $rowNotes = $this->text($d, "intense-restraint-{$row}-notes");

            if (! array_filter([$drug, $mgKg, $ml, $time, $rowNotes])) {
                continue;
            }

            $evaluation->restraints()->create([
                'mobilization_type' => 'chemical',
                'drug' => $drug,
                'dose_mg_per_kg' => $this->number($mgKg),
                'dose_ml' => $this->number($ml),
                'administered_time' => $this->time($time),
                'notes' => $rowNotes,
            ]);
        }

        $physical = [];
        foreach ($d as $key => $value) {
            if (str_starts_with($key, 'intense-physical-') && $value !== '' && $value !== null) {
                $physical[] = substr($key, strlen('intense-physical-')).': '.$value;
            }
        }
        $mobilizationPhysical = $this->text($d, 'intense-mobilization-physical');
        if ($physical || $mobilizationPhysical) {
            $evaluation->restraints()->create([
                'mobilization_type' => 'physical',
                'physical_method' => $physical ? mb_substr(implode('; ', $physical), 0, 100) : null,
                'notes' => $mobilizationPhysical,
            ]);
        }

        $mobilizationChemical = $this->text($d, 'intense-mobilization-chemical');
        if ($mobilizationChemical && ! $evaluation->restraints()->where('mobilization_type', 'chemical')->exists()) {
            $evaluation->restraints()->create([
                'mobilization_type' => 'chemical',
                'notes' => $mobilizationChemical,
            ]);
        }

        $labNotes = $this->text($d, 'intense-lab');
        foreach (self::SAMPLE_TYPES as $type) {
            if (! empty($d["intense-sample-{$type}"])) {
                $evaluation->labSamples()->create([
                    'sample_type' => $type,
                    'result_notes' => $labNotes,
                ]);
            }
        }
        foreach (['biopsy', 'xray'] as $type) {
            $value = $this->text($d, "intense-{$type}");
            if ($value !== null) {
                $evaluation->labSamples()->create(['sample_type' => $type, 'result_notes' => $value]);
            }
        }

        return $evaluation;
    }

    private function storeQuick(array $base, array $d): ClinicalEvaluation
    {
        $evaluation = ClinicalEvaluation::create($base + [
            'evaluation_type' => 'Revision_Rapida',
            'evaluation_reason' => mb_substr($this->text($d, 'quick-reason') ?? 'quick_check', 0, 100),
            'evaluation_date' => $this->date($d['quick-date'] ?? null),
            'temperature_c' => $this->number($d['quick-temperature'] ?? null),
            'heart_rate' => $this->integer($d['quick-heart-rate'] ?? null),
            'respiratory_rate' => $this->integer($d['quick-respiratory-rate'] ?? null),
            'weight_kg' => $this->number($d['quick-weight'] ?? null),
            'attitude' => $this->checked($d, 'attitude'),
            'body_condition_score' => $this->score($d['quick-body-score'] ?? null),
            'presumptive_diagnosis' => $this->text($d, 'quick-diagnosis'),
            'recommendations' => $this->text($d, 'quick-recommendations'),
            'is_fit_for_wild_release' => ($d['quick-release'] ?? '') === 'si' ? 1 : 0,
        ]);

        foreach (self::QUICK_GROUPS as $group) {
            if (in_array($group, ['attitude', 'body-condition'], true)) {
                continue;
            }
            $selected = $this->checked($d, $group);
            if ($selected !== null) {
                $evaluation->findings()->create([
                    'organ_system' => $group,
                    'status' => preg_match('/^(aspecto normal|normal|frecuencia .* normal)$/iu', $selected) ? 'normal' : 'abnormal',
                    'description' => $selected,
                ]);
            }
        }

        return $evaluation;
    }

    private function storeReview(array $base, array $d): ClinicalEvaluation
    {
        $notes = array_filter([
            $this->text($d, 'notes'),
            $this->labelled('Próxima revisión', $this->text($d, 'next_date')),
        ]);

        return ClinicalEvaluation::create($base + [
            'evaluation_type' => 'Revision_Rapida',
            'evaluation_reason' => 'Seguimiento: '.($this->text($d, 'reason') ?? 'routine'),
            'destination_ruling' => $this->text($d, 'status'),
            'assessment_reason' => $notes ? implode("\n", $notes) : null,
            'evaluation_date' => now()->toDateString(),
        ]);
    }

    private function text(array $d, string $key): ?string
    {
        $value = $d[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    private function labelled(string $label, ?string $value): ?string
    {
        return $value === null ? null : "{$label}: {$value}";
    }

    private function checked(array $d, string $group): ?string
    {
        $prefix = "quick-{$group}-";
        $options = [];

        foreach ($d as $key => $value) {
            if (str_starts_with($key, $prefix) && ! empty($value) && $key !== 'quick-body-score') {
                $options[] = substr($key, strlen($prefix));
            }
        }

        return $options ? implode(', ', $options) : null;
    }

    private function number(mixed $value): ?float
    {
        if (is_string($value) && preg_match('/-?\d+(?:[.,]\d+)?/', $value, $match)) {
            return (float) str_replace(',', '.', $match[0]);
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private function score(mixed $value): ?int
    {
        $score = $this->integer($value);

        return $score !== null && $score >= 1 && $score <= 5 ? $score : null;
    }

    private function integer(mixed $value): ?int
    {
        $number = $this->number($value);

        return $number === null ? null : (int) round($number);
    }

    private function date(mixed $value): string
    {
        $parsed = is_string($value) ? date_create($value) : false;

        return $parsed ? $parsed->format('Y-m-d') : now()->toDateString();
    }

    private function time(?string $value): ?string
    {
        return $value !== null && preg_match('/^(\d{1,2}):(\d{2})/', $value, $m)
            ? sprintf('%02d:%02d:00', min((int) $m[1], 23), min((int) $m[2], 59))
            : null;
    }
}
