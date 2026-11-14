<?php

namespace App\Actions\Admin\Content;

use App\Actions\Media\DeleteMediaFileAfterCommitAction;
use App\Actions\Media\ResolveMediaDiskAction;

class DeleteContentImageAction
{
    private DeleteMediaFileAfterCommitAction $delete;

    public function __construct(private ResolveContentImageUrlAction $resolver, ?DeleteMediaFileAfterCommitAction $delete = null)
    {
        $this->delete = $delete ?? new DeleteMediaFileAfterCommitAction;
    }

    /** Borra el archivo solo si la ruta es gestionada (api-008 CA-08); delega en api-013. */
    public function execute(?string $path): void
    {
        if (! $this->resolver->isManaged($path)) {
            return;
        }

        $this->delete->execute($path, ResolveMediaDiskAction::SCOPE_PUBLIC);
    }
}
