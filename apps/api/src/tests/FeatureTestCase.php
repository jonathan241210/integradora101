<?php

namespace Tests;

use Illuminate\Foundation\Testing\DatabaseTransactions;

abstract class FeatureTestCase extends TestCase
{
    use DatabaseTransactions;
}
