<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesSpeciesSheetEdit;
use App\Http\Requests\JsonFormRequest;

/** PATCH of a submitted request (CA-14 to CA-16, CA-22, CA-23, CA-25). */
class UpdateSpeciesPublicationRequest extends JsonFormRequest
{
    use ValidatesSpeciesSheetEdit;
}
