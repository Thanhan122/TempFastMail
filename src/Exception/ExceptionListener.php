<?php

namespace App\Exception;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;

class ExceptionListener
{
    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        if ($exception instanceof AbstractCustomException) {
            $response = new JsonResponse(
                [
                    'error' => $exception->getErrorMessage(),
                    'code' => $exception->getErrorCode(),
                ],
                $exception->getStatusCode()
            );

            $event->setResponse($response);
        }
    }
}
