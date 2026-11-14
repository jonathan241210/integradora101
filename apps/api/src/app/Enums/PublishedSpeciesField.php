<?php

namespace App\Enums;

/** Keys of the public species sheet (RN-13). */
enum PublishedSpeciesField: string
{
    case ScientificName = 'scientific_name';
    case Origin = 'origin';
    case Habitat = 'habitat';
    case ConservationStatus = 'conservation_status';
    case SizeCm = 'size_cm';
    case GestationPeriod = 'gestation_period';
    case Diet = 'diet';
    case Longevity = 'longevity';
    case Characteristics = 'characteristics';

    /**
     * Keys accepted today. The others are reserved and not implemented
     * (DBR-013 question 8: "not for now").
     *
     * @return list<self>
     */
    public static function implemented(): array
    {
        return [self::ScientificName, self::Origin, self::Habitat];
    }

    /** @return list<string> */
    public static function implementedValues(): array
    {
        return array_map(fn (self $case) => $case->value, self::implemented());
    }

    /** @return list<string> Default selection (RN-13). */
    public static function defaults(): array
    {
        return self::implementedValues();
    }
}
