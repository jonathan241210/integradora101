<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\SpeciesPublication\ShowSpeciesImageAction;
use App\Http\Controllers\Controller;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Published photo as a binary; the JSON never carries a URL (RN-08, CA-40). */
class SpeciesImageController extends Controller
{
    public function show(int $id, ShowSpeciesImageAction $action): StreamedResponse
    {
        return $action->execute($id);
    }
}
