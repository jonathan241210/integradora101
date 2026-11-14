<?php

namespace App\Enums;

enum SpeciesRequestStatus: string
{
    case Submitted = 'submitted';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
}
