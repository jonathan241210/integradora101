<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Memories\Review\ShowMemoryImageForReviewAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MemoryReviewImageController extends Controller
{
    public function __invoke(Request $request, string $id, ShowMemoryImageForReviewAction $action): Response
    {
        return $action->execute($id);
    }
}
