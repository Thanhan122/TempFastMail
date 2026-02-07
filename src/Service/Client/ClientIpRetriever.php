<?php

namespace App\Service\Client;

use Symfony\Component\HttpFoundation\Request;

class ClientIpRetriever
{
    public function getClientIp(Request $request): string
    {
        // Prefer Cloudflare header if present
        if ($cfIp = $request->headers->get('CF-Connecting-IP')) {
            return $cfIp;
        }

        // Otherwise rely on Symfony's built-in resolver
        return $request->getClientIp() ?? 'unknown';
    }
}
