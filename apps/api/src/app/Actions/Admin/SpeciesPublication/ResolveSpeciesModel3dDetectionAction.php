<?php

namespace App\Actions\Admin\SpeciesPublication;

use App\Actions\Media\ResolveMediaDiskAction;
use Illuminate\Support\Facades\Storage;

/**
 * Detects a 3D model for a species by convention (api-032).
 * Priority: valid existing species.model_3d_path > normalized filename in models/ > missing.
 */
class ResolveSpeciesModel3dDetectionAction
{
    public function __construct(private readonly ResolveMediaDiskAction $disks) {}

    /**
     * @return array{status: 'assigned'|'detected'|'missing', detected_model_3d_path: ?string, model_3d_url: ?string, enabled: bool, can_toggle: bool}
     */
    public function execute(?string $commonName, ?string $currentModel3dPath, bool $model3dEnabled = true): array
    {
        $disk = Storage::disk($this->disks->publicDisk());

        if ($this->isValidPath($currentModel3dPath) && $disk->exists($currentModel3dPath)) {
            return [
                'status' => 'assigned',
                'detected_model_3d_path' => $currentModel3dPath,
                'model_3d_url' => $this->urlFor($disk->url($currentModel3dPath)),
                'enabled' => $model3dEnabled,
                'can_toggle' => true,
            ];
        }

        $candidate = $this->candidatePath($commonName);
        if ($candidate !== null && $disk->exists($candidate)) {
            return [
                'status' => 'detected',
                'detected_model_3d_path' => $candidate,
                'model_3d_url' => $this->urlFor($disk->url($candidate)),
                'enabled' => $model3dEnabled,
                'can_toggle' => true,
            ];
        }

        return [
            'status' => 'missing',
            'detected_model_3d_path' => null,
            'model_3d_url' => null,
            'enabled' => $model3dEnabled,
            'can_toggle' => false,
        ];
    }

    public function candidatePath(?string $commonName): ?string
    {
        $normalized = $this->normalize($commonName);
        if ($normalized === '') {
            return null;
        }

        return 'models/'.$normalized.'.glb';
    }

    public function normalize(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        $value = trim(mb_strtolower($value));
        if ($value === '') {
            return '';
        }

        $value = strtr($value, [
            'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a', 'ã' => 'a',
            'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
            'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o', 'õ' => 'o',
            'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u',
            'ñ' => 'n', 'ç' => 'c',
        ]);

        if (class_exists(\Normalizer::class)) {
            $normalized = \Normalizer::normalize($value, \Normalizer::FORM_D);
            if (is_string($normalized)) {
                $value = preg_replace('/\p{Mn}+/u', '', $normalized) ?? $value;
            }
        }

        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
        $value = trim($value, '-');
        $value = preg_replace('/-+/', '-', $value) ?? '';

        return $value;
    }

    private function isValidPath(?string $path): bool
    {
        return $path !== null
            && $path !== ''
            && str_starts_with($path, 'models/')
            && str_ends_with(strtolower($path), '.glb')
            && ! str_contains($path, '..')
            && ! str_contains($path, '\\');
    }

    private function urlFor(string $url): string
    {
        $path = parse_url($url, PHP_URL_PATH);

        return is_string($path) && $path !== '' ? $path : $url;
    }
}
