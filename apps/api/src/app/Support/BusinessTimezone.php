<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeZone;
use RuntimeException;

/**
 * Único punto de lectura de la zona de negocio (api-025 RN-09). Los instantes se guardan y se responden
 * en UTC; esta zona solo se aplica para construir días, rangos y vigencias.
 */
class BusinessTimezone
{
    /** Identificador IANA de la zona del zoológico (`arca.timezone`, variable `ARCA_TIMEZONE`). */
    public static function name(): string
    {
        return (string) config('arca.timezone');
    }

    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now(self::name());
    }

    /** Fecha de hoy (`Y-m-d`) en la zona de negocio. */
    public static function today(): string
    {
        return self::now()->toDateString();
    }

    /** Inicio del día de negocio (`Y-m-d`) como instante UTC. Reutilizable por reportes y exportadores. */
    public static function startOfDayUtc(string $date): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $date, self::name())->startOfDay()->utc();
    }

    /** Fin exclusivo del día de negocio (inicio del día siguiente) como instante UTC. */
    public static function endOfDayUtc(string $date): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $date, self::name())->startOfDay()->addDay()->startOfDay()->utc();
    }

    /** Día de negocio (`Y-m-d`) al que pertenece un instante. */
    public static function dateOf(\DateTimeInterface $instant): string
    {
        return CarbonImmutable::instance($instant)->setTimezone(self::name())->toDateString();
    }

    /** Falla con un mensaje claro si `ARCA_TIMEZONE` está vacío o no es un identificador IANA. */
    public static function assertValid(): void
    {
        $value = config('arca.timezone');

        if (! is_string($value) || $value === '' || ! self::isIana($value)) {
            throw new RuntimeException(sprintf(
                'ARCA_TIMEZONE no es una zona horaria válida: "%s". Usa un identificador IANA, por ejemplo America/Mexico_City.',
                is_scalar($value) ? (string) $value : gettype($value),
            ));
        }
    }

    private static function isIana(string $value): bool
    {
        return ($value === 'UTC' || str_contains($value, '/'))
            && in_array($value, DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC), true);
    }
}
