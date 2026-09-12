<?php

namespace App\Repository;

use App\Entity\TemporaryEmailBox;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TemporaryEmailBox>
 */
class TemporaryEmailBoxRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TemporaryEmailBox::class);
    }

    public function deleteOlderThan(\DateTimeImmutable $cutoffDate): int
    {
        return $this->getEntityManager()->createQuery(
            'DELETE FROM App\Entity\TemporaryEmailBox t 
             WHERE t.createdAt < :cutoffDate 
             AND t.id NOT IN (SELECT IDENTITY(r.temporaryEmailBox) FROM App\Entity\ReceivedEmail r WHERE r.temporaryEmailBox IS NOT NULL)'
        )
            ->setParameter('cutoffDate', $cutoffDate)
            ->execute();
    }
}
