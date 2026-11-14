<?php

namespace App\Enums;

/** Decisiones registradas en visitor_memory_reviews (api-010 CA-11, CA-12). */
enum MemoryReviewDecision: string
{
    case Accepted = 'accepted';
    case Rejected = 'rejected';
}
