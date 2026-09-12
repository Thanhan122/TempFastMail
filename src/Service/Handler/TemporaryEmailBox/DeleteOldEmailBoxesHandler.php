<?php

namespace App\Service\Handler\TemporaryEmailBox;

use App\Entity\TemporaryEmailBox;
use App\Repository\TemporaryEmailBoxRepository;
use Doctrine\ORM\EntityManagerInterface;

class DeleteOldEmailBoxesHandler
{
    public function __construct(
        private TemporaryEmailBoxRepository $temporaryEmailBoxRepository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    public function deleteOlderThan(\DateTimeImmutable $olderThan): int
    {
        return $this->temporaryEmailBoxRepository->deleteOlderThan($olderThan);
    }
}
