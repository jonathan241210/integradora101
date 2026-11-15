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
        ], [
            'kind.required' => 'Selecciona un tipo de evaluación.',
            'kind.in' => 'El tipo de evaluación no es válido.',
            'animal_id.required' => 'Selecciona un animal.',
            'animal_id.exists' => 'El animal seleccionado no existe.',
            'data.required' => 'Los datos de la evaluación son obligatorios.',
            'data.array' => 'Los datos de la evaluación no son válidos.',
        ]);

        $data = array_map(
            fn ($value) => is_string($value) ? trim($value) : $value,
            $payload['data'],
        );

        $followUp = $this->validateFollowUp($data);

        $evaluation = DB::transaction(function () use ($payload, $data, $followUp, $request) {
            $base = [
                'animal_id' => $payload['animal_id'],
                'veterinarian_id' => $request->user()->id,
                'is_follow_up' => 1,
                'follow_up_status' => $followUp['status'],
                'next_review_date' => $followUp['next_review_date'],
            ];

            return match ($payload['kind']) {
                'intense' => $this->storeIntense($base, $data, $followUp),
                'quick' => $this->storeQuick($base, $data, $followUp),
                'review' => $this->storeReview($base, $data, $followUp),
            };
        });

        $nextReviewDate = $evaluation->next_review_date;
        if ($nextReviewDate instanceof \DateTimeInterface) {
            $nextReviewDate = $nextReviewDate->format('Y-m-d');
        }

        return response()->json(['data' => [
            'id' => $evaluation->id,
            'evaluation_type' => $evaluation->evaluation_type,
            'animal_id' => $evaluation->animal_id,
            'evaluation_date' => $evaluation->evaluation_date,
            'follow_up_status' => $evaluation->follow_up_status,
            'next_review_date' => $nextReviewDate,
            'is_follow_up' => (bool) $evaluation->is_follow_up,
        ]], 201);
    }

    /**
     * @return array{status: string, next_review_date: string, reason: string}
     */
    private function validateFollowUp(array $d): array
    {
        $status = $this->text($d, 'follow_up_status') ?? $this->text($d, 'review-status') ?? $this->text($d, 'status');
        $allowed = ['stable', 'monitoring', 'follow_up', 'follow-up'];
        $messages = [];

        if ($status === null || $status === '') {
            $messages['data.follow_up_status'] = ['El estado de seguimiento es obligatorio.'];
        } elseif (! in_array($status, $allowed, true)) {
            $messages['data.follow_up_status'] = ['El estado de seguimiento no es válido.'];
        }

        $nextDateRaw = $this->text($d, 'next_review_date') ?? $this->text($d, 'review-next-date') ?? $this->text($d, 'next_date');
        $parsedDate = $nextDateRaw ? date_create($nextDateRaw) : false;
        if ($nextDateRaw === null || $nextDateRaw === '') {
            $messages['data.next_review_date'] = ['La próxima revisión es obligatoria.'];
        } elseif ($parsedDate === false) {
            $messages['data.next_review_date'] = ['La fecha de próxima revisión no es válida.'];
        }

        $reason = $this->text($d, 'follow_up_reason') ?? $this->text($d, 'review-reason') ?? $this->text($d, 'reason');
        if ($reason === null || $reason === '') {
            $messages['data.follow_up_reason'] = ['El motivo de seguimiento es obligatorio.'];
        }

        if ($messages) {
            abort(response()->json([
                'message' => 'Completa los datos de seguimiento obligatorios.',
                'errors' => $messages,
            ], 422));
        }

        $normalizedStatus = $status === 'follow-up' ? 'follow_up' : $status;

        return [
            'status' => $normalizedStatus,
            'next_review_date' => $parsedDate->format('Y-m-d'),
            'reason' => $reason,
        ];
    }

    private function storeIntense(array $base, array $d, array $followUp): ClinicalEvaluation
    {
        $mobilizationTypes = array_values(array_filter([
            ! empty($d['intense-mobilization-type-physical']) ? 'física' : null,
            ! empty($d['intense-mobilization-type-chemical']) ? 'química' : null,
        ]));

        $notes = array_filter([
            $this->labelled('Seguimiento', $this->followUpReasonLabel($followUp['reason'])),
            $this->text($d, 'intense-general-notes'),
            $this->labelled('Animales afectados', $this->text($d, 'intense-affected')),
            $this->labelled('MVZ', $this->text($d, 'intense-mvz')),
            $mobilizationTypes ? 'Tipo de movilización: '.implode(', ', $mobilizationTypes) : null,
        ]);

        $evaluation = ClinicalEvaluation::create($base + [
            'evaluation_type' => 'Historia_Clinica_Completa',
            'evaluation_reason' => $this->normalizeFollowUpReason($followUp['reason']),
            'assessment_reason' => $notes ? implode("\n", $notes) : null,
            'evaluation_date' => $this->date($d['intense-date'] ?? null),
            'temperature_c' => $this->number($d['intense-vital-temp'] ?? null),
            'heart_rate' => $this->integer($d['intense-vital-fc'] ?? null),
            'respiratory_rate' => $this->integer($d['intense-vital-fr'] ?? null),
            'capillary_refill_time' => $this->integer($d['intense-vital-tlc'] ?? null),
            'weight_kg' => $this->number($d['intense-weight'] ?? null),
            'body_condition_score' => $this->score($d['intense-vital-cc'] ?? null),
            'patient_age' => $this->text($d, 'intense-age'),
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
        $physicalDetail = [];
        foreach ($d as $key => $value) {
            if (str_starts_with($key, 'intense-physical-') && $value !== '' && $value !== null) {
                $method = substr($key, strlen('intense-physical-'));
                $applied = ! in_array(mb_strtolower(trim((string) $value)), ['no', 'false', '0'], true);
                $physicalDetail[] = $method.': '.($applied ? 'si' : 'no');

                if ($applied) {
                    $physical[] = $method;
                }
            }
        }
        $mobilizationPhysical = $this->text($d, 'intense-mobilization-physical');
        $physicalTypeChecked = ! empty($d['intense-mobilization-type-physical']);
        if ($physicalDetail || $mobilizationPhysical || $physicalTypeChecked) {
            $evaluation->restraints()->create([
                'mobilization_type' => 'physical',
                'physical_method' => $physical ? mb_substr(implode(', ', $physical), 0, 50) : null,
                'notes' => implode("\n", array_filter([$mobilizationPhysical, implode('; ', $physicalDetail)])) ?: ($physicalTypeChecked ? 'Movilización física' : null),
            ]);
        }

        $mobilizationChemical = $this->text($d, 'intense-mobilization-chemical');
        $chemicalTypeChecked = ! empty($d['intense-mobilization-type-chemical']);
        if (($mobilizationChemical || $chemicalTypeChecked) && ! $evaluation->restraints()->where('mobilization_type', 'chemical')->exists()) {
            $evaluation->restraints()->create([
                'mobilization_type' => 'chemical',
                'notes' => $mobilizationChemical ?: ($chemicalTypeChecked ? 'Movilización química' : null),
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

    private function storeQuick(array $base, array $d, array $followUp): ClinicalEvaluation
    {
        $notes = array_filter([
            $this->labelled('Seguimiento', $this->followUpReasonLabel($followUp['reason'])),
            $this->labelled('MVZ', $this->text($d, 'quick-mvz')),
        ]);

        $evaluation = ClinicalEvaluation::create($base + [
            'evaluation_type' => 'Revision_Rapida',
            'evaluation_reason' => $this->normalizeFollowUpReason($followUp['reason']),
            'assessment_reason' => $notes ? implode("\n", $notes) : null,
            'evaluation_date' => $this->date($d['quick-date'] ?? null),
            'temperature_c' => $this->number($d['quick-temperature'] ?? null),
            'heart_rate' => $this->integer($d['quick-heart-rate'] ?? null),
            'respiratory_rate' => $this->integer($d['quick-respiratory-rate'] ?? null),
            'weight_kg' => $this->number($d['quick-weight'] ?? null),
            'patient_age' => $this->text($d, 'quick-age'),
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

    private function storeReview(array $base, array $d, array $followUp): ClinicalEvaluation
    {
        $notes = array_filter([
            $this->labelled('Seguimiento', $this->followUpReasonLabel($followUp['reason'])),
            $this->text($d, 'notes'),
        ]);

        return ClinicalEvaluation::create($base + [
            'evaluation_type' => 'Revision_Rapida',
            'evaluation_reason' => $this->normalizeFollowUpReason($followUp['reason']),
            'assessment_reason' => $notes ? implode("\n", $notes) : null,
            'evaluation_date' => $this->date($d['evaluation_date'] ?? $d['review-date'] ?? null),
            'patient_age' => $this->text($d, 'patient_age') ?? $this->text($d, 'review-age'),
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

    private function normalizeFollowUpReason(string $reason): string
    {
        $map = [
            'routine' => 'routine',
            'treatment' => 'treatment',
            'observation' => 'observation',
            'seguimiento rutinario' => 'routine',
            'control de tratamiento' => 'treatment',
            'observación' => 'observation',
            'observacion' => 'observation',
        ];

        $key = mb_strtolower(trim($reason));

        return mb_substr($map[$key] ?? $reason, 0, 100);
    }

    private function followUpReasonLabel(string $reason): string
    {
        return match ($this->normalizeFollowUpReason($reason)) {
            'routine' => 'Seguimiento rutinario',
            'treatment' => 'Control de tratamiento',
            'observation' => 'Observación',
            default => $reason,
        };
    }
}
