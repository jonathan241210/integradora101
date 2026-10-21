<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VisitorAccessCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public string $purpose) {}

    public function envelope(): Envelope
    {
        $subject = $this->purpose === 'password_reset'
            ? 'Código para restablecer tu contraseña'
            : 'Código para verificar tu correo';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: 'mail.visitor-access-code');
    }
}
