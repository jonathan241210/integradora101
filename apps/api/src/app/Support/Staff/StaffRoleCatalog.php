<?php

namespace App\Support\Staff;

/**
 * Catálogo cerrado de roles de personal (api-023 RN-01). Solo datos: etiquetas en español y roles de consola.
 * Las reglas (quién puede asignar o ver qué) viven en Actions.
 */
final class StaffRoleCatalog
{
    /** Código del rol que solo se gestiona desde la consola del servidor (api-023 RN-06). */
    public const CONSOLE_MANAGED_ROLE = 'admin';

    public const ROLE_LABELS = [
        'admin' => 'Administrador de Presidencia',
        'zoo-admin' => 'Administrador del Zoológico',
        'executive' => 'Consulta directiva',
        'communications' => 'Comunicación',
        'cashier' => 'Cajero',
        'veterinarian' => 'Veterinario',
    ];

    public const PERMISSION_LABELS = [
        'dashboard.view' => 'Ver panel ejecutivo',
        'reports.view' => 'Ver reportes de boletos',
        'reports.cancellations.view' => 'Ver reporte de cancelaciones',
        'tickets.view' => 'Consultar boletos',
        'tickets.view-all' => 'Consultar boletos de todos los cajeros',
        'tickets.create' => 'Registrar venta de boletos',
        'tickets.cancel' => 'Cancelar boletos',
        'ticket-prices.manage' => 'Administrar precios de boletos',
        'cash-closings.view' => 'Consultar cierres de caja',
        'cash-closings.create' => 'Crear cierre de caja',
        'medical-records.view' => 'Consultar expedientes clínicos',
        'medical-records.create' => 'Crear expediente clínico',
        'medical-records.update' => 'Actualizar expediente clínico',
        'specimens.view' => 'Consultar ejemplares',
        'specimens.update' => 'Actualizar datos del ejemplar',
        'users.manage' => 'Administrar cuentas de personal',
        'news.manage' => 'Administrar noticias',
        'events.manage' => 'Administrar eventos',
        'enclosures.manage' => 'Administrar recintos',
        'species.review' => 'Revisar solicitudes de especies',
        'memories.review' => 'Revisar momentos de visitantes',
        'public-content.view' => 'Consultar contenido público',
    ];

    /** @return list<string> */
    public static function roles(): array
    {
        return array_keys(self::ROLE_LABELS);
    }

    /** @return list<string> Roles que se pueden asignar sin la consola (todos menos los de consola). */
    public static function assignableRoles(): array
    {
        return array_values(array_diff(self::roles(), self::consoleManagedRoles()));
    }

    public static function roleLabel(string $role): string
    {
        return self::ROLE_LABELS[$role] ?? $role;
    }

    public static function permissionLabel(string $permission): string
    {
        return self::PERMISSION_LABELS[$permission] ?? $permission;
    }

    /** @return list<string> */
    public static function consoleManagedRoles(): array
    {
        return [self::CONSOLE_MANAGED_ROLE];
    }

    /** @param  iterable<string>  $roleNames */
    public static function isConsoleManaged(iterable $roleNames): bool
    {
        foreach ($roleNames as $name) {
            if (in_array($name, self::consoleManagedRoles(), true)) {
                return true;
            }
        }

        return false;
    }
}
