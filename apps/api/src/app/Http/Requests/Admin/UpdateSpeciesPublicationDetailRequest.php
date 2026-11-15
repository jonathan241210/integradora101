<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesSpeciesSheetEdit;
use App\Http\Requests\JsonFormRequest;

/** PATCH of the sheet of an unpublished species (CA-37). */
class UpdateSpeciesPublicationDetailRequest extends JsonFormRequest
{
    use ValidatesSpeciesSheetEdit;
}
