<?php

namespace App\Enums;

/** Closed list of animal types (DBR-004). */
enum SpeciesCategory: string
{
    case Mammal = 'mammal';
    case Bird = 'bird';
    case Reptile = 'reptile';
    case Amphibian = 'amphibian';
    case Fish = 'fish';
    case Invertebrate = 'invertebrate';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
