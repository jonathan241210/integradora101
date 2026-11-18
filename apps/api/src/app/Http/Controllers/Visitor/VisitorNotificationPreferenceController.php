<?php

namespace App\Http\Controllers\Visitor;

use App\Actions\Visitor\ShowNotificationPreferencesAction;
use App\Actions\Visitor\UpdateNotificationPreferencesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Visitor\UpdateNotificationPreferencesRequest;
use App\Http\Resources\Visitor\NotificationPreferencesResource;
use App\Models\Visitor;
use Illuminate\Http\Request;

class VisitorNotificationPreferenceController extends Controller
{
    public function show(Request $request, ShowNotificationPreferencesAction $action): NotificationPreferencesResource
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return new NotificationPreferencesResource($action->execute($visitor));
    }

    public function update(UpdateNotificationPreferencesRequest $request, UpdateNotificationPreferencesAction $action): NotificationPreferencesResource
    {
        /** @var Visitor $visitor */
        $visitor = $request->user();

        return new NotificationPreferencesResource($action->execute($visitor, $request->patch()));
    }
}
