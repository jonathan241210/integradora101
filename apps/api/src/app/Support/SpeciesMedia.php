<?php

namespace App\Support;

/** Folders and path rules used by species photos (ADR 0026, api-014). */
final class SpeciesMedia
{
    public const PENDING_FOLDER = 'species-requests';

    public const PUBLIC_FOLDER = 'species';

    public const MANAGED_PATH_PATTERN = '#^species(-requests)?/[0-9a-f-]{36}\.(jpg|png)$#';
}
