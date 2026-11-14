<?php

namespace App\Exceptions;

use RuntimeException;

/** Configuración inválida de «Momentos para recordar» (api-010 CA-30): responde 500. */
class MemoryConfigurationException extends RuntimeException {}
