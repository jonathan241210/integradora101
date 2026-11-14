<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\SpeciesPublication\ShowSpeciesRequestImageAction;
use App\Http\Controllers\Controller;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Pending photo as a binary; the JSON never carries a URL (RN-08). */
class SpeciesPublicationRequestImageController extends Controller
{
    public function __invoke(int $id, ShowSpeciesRequestImageAction $action): StreamedResponse
    {
        return $action->execute($id);
    }
}
