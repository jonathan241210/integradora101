<?php

namespace Tests\Feature\Visitor;

use Tests\Concerns\RegistersVisitors;
use Tests\FeatureTestCase;

abstract class VisitorFeatureTestCase extends FeatureTestCase
{
    use RegistersVisitors;
}
