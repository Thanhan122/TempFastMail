<?php

namespace App\DTO\Response;

class ValidateEmailBoxResponseDto
{
    public function __construct(
        public bool $is_valid,
    ) {
    }
}
