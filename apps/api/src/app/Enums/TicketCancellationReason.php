<?php

namespace App\Enums;

/**
 * Catálogo cerrado de motivos de cancelación de boletos (api-022 RN-02). Los códigos son identificadores
 * en inglés; las etiquetas son de UI y van en español. Agregar o renombrar un motivo exige revisar la spec.
 */
enum TicketCancellationReason: string
{
    case CaptureError = 'capture_error';
    case DuplicateCharge = 'duplicate_charge';
    case WrongTicketType = 'wrong_ticket_type';
    case VisitorWithdrew = 'visitor_withdrew';
    case Other = 'other';

    /** Etiqueta con la que se presentan las cancelaciones anteriores a la feature (código nulo, CA-08). */
    public const UNCLASSIFIED_LABEL = 'Sin clasificar (anterior)';

    public function label(): string
    {
        return match ($this) {
            self::CaptureError => 'Error de captura',
            self::DuplicateCharge => 'Cobro duplicado',
            self::WrongTicketType => 'Tipo de boleto equivocado',
            self::VisitorWithdrew => 'El visitante desistió',
            self::Other => 'Otro',
        };
    }

    /** Solo `other` exige comentario (RN-04). */
    public function commentRequired(): bool
    {
        return $this === self::Other;
    }

    public function commentPolicy(): string
    {
        return $this->commentRequired() ? 'required' : 'optional';
    }

    /** Etiqueta para un código guardado, o la de «sin clasificar» cuando es nulo. */
    public static function labelFor(?self $reason): string
    {
        return $reason?->label() ?? self::UNCLASSIFIED_LABEL;
    }
}
