<?php

namespace App\Http\Controllers\Visitor;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrivacyNoticeResource;

class PrivacyNoticeController extends Controller
{
    public function __invoke(): PrivacyNoticeResource
    {
        return new PrivacyNoticeResource([
            'version' => config('visitor.privacy_notice_version'),
            'content' => trans('visitor.privacy_notice'),
        ]);
    }
}
