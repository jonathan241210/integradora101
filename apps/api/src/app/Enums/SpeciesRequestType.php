<?php

namespace App\Enums;

enum SpeciesRequestType: string
{
    case Publish = 'publish';
    case Update = 'update';
}
