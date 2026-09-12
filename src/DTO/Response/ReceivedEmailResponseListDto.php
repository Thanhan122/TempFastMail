<?php

namespace App\DTO\Response;

use App\Entity\ReceivedEmail;

class ReceivedEmailResponseListDto
{
    public function __construct(
        public string $uuid,
        public string $from,
        public string $real_to,
        public ?string $from_name,
        public string $subject,
        public ?string $code,
        public \DateTimeImmutable $received_at,
    ) {
    }

    public static function fromEntity(ReceivedEmail $email): self
    {
        $subject = $email->getSubject() ?? '';
        $html = $email->getHtml() ?? '';
        $searchArea = $subject . ' ' . $html;

        $code = null;
        if (preg_match('/\b\d{6}\b/', $searchArea, $matches)) {
            $code = $matches[0];
        }

        return new self(
            uuid: $email->getUuid(),
            from: $email->getFromAddress() ?? $email->getRealFrom(),
            real_to: $email->getRealTo(),
            from_name: $email->getFromName(),
            subject: $subject ?: '(no subject)',
            code: $code,
            received_at: $email->getCreatedAt() ?? new \DateTimeImmutable(),
        );
    }
}
