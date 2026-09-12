<?php

namespace App\Service\Handler\TemporaryEmailBox;

use App\Entity\TemporaryEmailBox;
use App\Exception\Domain\ThereAreNoDomainsException;
use App\Repository\DomainRepository;
use App\Service\Factory\TemporaryEmailBoxFactory;
use Doctrine\ORM\EntityManagerInterface;

class CreateEmailBoxHandler
{
    public function __construct(
        private DomainRepository $domainRepository,
        private TemporaryEmailBoxFactory $emailBoxFactory,
        private EntityManagerInterface $entityManager,
        private TemporaryEmailBoxGenerator $temporaryEmailBoxGenerator,
    ) {
    }

    public function create(string $creatorIp, ?string $specificDomain = null): TemporaryEmailBox
    {
        if ($specificDomain) {
            $domain = $this->domainRepository->findOneBy(['domain' => $specificDomain]);
        } else {
            $domain = $this->domainRepository->findOneActiveRandomDomain();
        }

        if ($domain === null) {
            throw new ThereAreNoDomainsException();
        }

        $emailAddress = $this->temporaryEmailBoxGenerator->generateUniqueEmailAddress($domain->getDomain());

        $emailBox = $this->emailBoxFactory->create($emailAddress, $creatorIp);

        $this->entityManager->persist($emailBox);
        $this->entityManager->flush();

        return $emailBox;
    }

    public function createWithEmail(string $email, string $creatorIp): TemporaryEmailBox
    {
        // Check if this email box already exists
        $existing = $this->entityManager->getRepository(TemporaryEmailBox::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return $existing;
        }

        $emailBox = $this->emailBoxFactory->create($email, $creatorIp);

        $this->entityManager->persist($emailBox);
        $this->entityManager->flush();

        return $emailBox;
    }
}
