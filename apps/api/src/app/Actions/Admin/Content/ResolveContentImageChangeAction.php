<?php

namespace App\Actions\Admin\Content;

class ResolveContentImageChangeAction
{
    /**
     * @return array{0: ?string, 1: ?string} Ruta final de image_path y acción (set, replaced, removed) o null si no cambia.
     */
    public function execute(?string $current, ?string $newPath, bool $remove): array
    {
        if ($newPath !== null) {
            return [$newPath, $current === null ? 'set' : 'replaced'];
        }

        if ($remove && $current !== null) {
            return [null, 'removed'];
        }

        return [$current, null];
    }
}
