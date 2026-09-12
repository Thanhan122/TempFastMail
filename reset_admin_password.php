<?php
// Script reset mật khẩu Admin cho TempFastMail (Chạy bên trong Container)
// Cách dùng: 
// 1. Copy file này vào thư mục gốc của project trên VPS
// 2. Chạy: docker compose exec tempfastmail php reset_admin_password.php admin@admin.dev matkhaumoi

require __DIR__ . '/vendor/autoload.php';

use App\Kernel;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

(new Dotenv())->bootEnv(__DIR__ . '/.env');

$kernel = new Kernel($_SERVER['APP_ENV'], (bool) $_SERVER['APP_DEBUG']);
$kernel->boot();

$container = $kernel->getContainer();
// Lấy EntityManager qua Doctrine service
$doctrine = $container->get('doctrine');
$entityManager = $doctrine->getManager();

if ($argc < 3) {
    echo "❌ Cách dùng: php reset_admin_password.php <email> <mat_khau_moi>\n";
    exit(1);
}

$email = $argv[1];
$newPassword = $argv[2];

echo "🔄 Đang tìm user: $email ...\n";

$userRepo = $entityManager->getRepository(User::class);
$user = $userRepo->findOneBy(['email' => $email]);

if (!$user) {
    echo "❌ Không tìm thấy user có email là: $email\n";
    exit(1);
}

// Hash password thủ công (Argon2id là default của Symfony hiện đại)
$hashedPassword = password_hash($newPassword, PASSWORD_ARGON2ID);

$user->setPassword($hashedPassword);
$entityManager->flush();

echo "✅ Đã thay đổi mật khẩu thành công!\n";
echo "📧 Email: $email\n";
echo "🔑 Pass mới: $newPassword\n";

