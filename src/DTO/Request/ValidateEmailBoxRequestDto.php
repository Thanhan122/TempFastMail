<?php

namespace App\DTO\Request;

class ValidateEmailBoxRequestDto
{
    public function __construct(
        public string $email,
        public string $uuid,
    ) {
    }
}
