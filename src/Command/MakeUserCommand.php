<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:make-user',
    description: 'Creates very first user from command line only if no users exist yet',
)]
class MakeUserCommand extends Command
{
    public function __construct(private EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Email')
            ->addArgument('password', InputArgument::REQUIRED, 'Password')
            ->addArgument('role', InputArgument::REQUIRED, 'Role')
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $email = $input->getArgument('email');
        $password = $input->getArgument('password');
        $role = $input->getArgument('role');

        /** @var UserRepository $userRepo */
        $userRepo = $this->entityManager->getRepository(User::class);

        if ($userRepo->count() > 0) {
            $io->error('Users already exist in the system. This command can only be used to create the very first user.');

            return Command::SUCCESS;
        }

        $user = new User();

        $user
            ->setEmail($email)
            ->setPassword(password_hash($password, PASSWORD_ARGON2ID))
            ->setRoles([$role])
        ;

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $io->success('User has been created! - ' . $email);

        return Command::SUCCESS;
    }
}
