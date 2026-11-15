<?php

namespace App\Enums;

/** Derived publication state of a species (RN-18). Not a column. */
enum PublicationStatus: string
{
    case NotPublished = 'not_published';
    case Pending = 'pending';
    case Published = 'published';
    case Unpublished = 'unpublished';

    public function nextRequestType(): ?SpeciesRequestType
    {
        return match ($this) {
            self::NotPublished => SpeciesRequestType::Publish,
            self::Published, self::Unpublished => SpeciesRequestType::Update,
            self::Pending => null,
        };
    }
}
