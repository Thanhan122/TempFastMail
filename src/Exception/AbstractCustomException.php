<?php

namespace App\Exception;

use Exception;

abstract class AbstractCustomException extends Exception
{
    abstract public function getStatusCode(): int;
    abstract public function getErrorCode(): int;
    abstract public function getErrorMessage(): string;
}
