<?php

namespace App\Command;

use App\Service\Handler\ReceivedEmail\DeleteOldReceivedEmailsHandler;
use App\Service\Handler\TemporaryEmailBox\DeleteOldEmailBoxesHandler;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:delete-old-emails',
    description: 'Deletes emails and email boxes older than 24 hours (or another specified time period via .env).',
)]
class DeleteOldEmailsCommand extends Command
{
    public function __construct(
        private DeleteOldReceivedEmailsHandler $deleteOldReceivedEmailsHandler,
        private DeleteOldEmailBoxesHandler $deleteOldEmailBoxesHandler,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        // 1. Láy cáu hình cho Email (Phút)
        $emailMinutes = $_ENV['DELETE_EMAILS_OLDER_THAN_MINUTES'] ?? 60;
        $emailCutoff = new \DateTimeImmutable('-' . $emailMinutes . ' minutes');

        // 2. Láy cáu hình cho Inbox (Giờ)
        $inboxHours = $_ENV['DELETE_INBOXES_OLDER_THAN_HOURS'] ?? 24;
        $inboxCutoff = new \DateTimeImmutable('-' . $inboxHours . ' hours');

        // --- Thưc thi xóa Email ---
        if ($emailMinutes > 0) {
            $deletedEmailCount = $this->deleteOldReceivedEmailsHandler->deleteOlderThan($emailCutoff);
            $io->success(sprintf(
                'Deleted %d emails older than %d minutes (Before: %s).',
                $deletedEmailCount,
                $emailMinutes,
                $emailCutoff->format('Y-m-d H:i:s')
            ));
        } else {
            $io->note('Email deletion is skipped (DELETE_EMAILS_OLDER_THAN_MINUTES is 0 or less).');
        }

        // --- Thưc thi xóa Inbox ---
        if ($inboxHours > 0) {
            $deletedInboxCount = $this->deleteOldEmailBoxesHandler->deleteOlderThan($inboxCutoff);
            $io->success(sprintf(
                'Deleted %d inboxes older than %d hours (Before: %s).',
                $deletedInboxCount,
                $inboxHours,
                $inboxCutoff->format('Y-m-d H:i:s')
            ));
        } else {
            $io->note('Inbox deletion is skipped (DELETE_INBOXES_OLDER_THAN_HOURS is 0 or less).');
        }

        return Command::SUCCESS;
    }
}
