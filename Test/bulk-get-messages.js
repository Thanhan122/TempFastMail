const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    BASE_URL: 'https://caughtin4k.online',
    MAIL_FILE: path.join(__dirname, '..', 'mail.txt'),
    // Số lượng request chạy song song cùng lúc
    CONCURRENCY: 2000,
    TIMEOUT: 30000,
    // File lưu kết quả (email có thư)
    OUTPUT_FILE: path.join(__dirname, 'mail_with_messages.txt'),
    // File lưu kết quả chi tiết (JSON)
    OUTPUT_JSON: path.join(__dirname, 'mail_messages_detail.json'),
};

function loadEmails() {
    const raw = fs.readFileSync(CONFIG.MAIL_FILE, 'utf-8');
    const emails = raw
        .split(/\r?\n/)
        .map(line => line.trim().toLowerCase())
        .filter(line => line.length > 0 && line.includes('@'));
    const unique = [...new Set(emails)];
    console.log(`📧 Đọc được ${unique.length} email (đã loại trùng)`);
    return unique;
}

async function getMessage(email) {
    try {
        const response = await axios.get(
            `${CONFIG.BASE_URL}/${email}/message`,
            { timeout: CONFIG.TIMEOUT }
        );

        if (response.status === 200 && response.data && Array.isArray(response.data) && response.data.length > 0) {
            return {
                email,
                hasMessage: true,
                messageCount: response.data.length,
                latestSubject: response.data[0]?.subject || '(no subject)',
                messages: response.data,
            };
        }

        return { email, hasMessage: false, messageCount: 0 };
    } catch (error) {
        return {
            email,
            hasMessage: false,
            messageCount: 0,
            error: error.response ? `${error.response.status}` : error.message,
        };
    }
}

async function main() {
    const emails = loadEmails();

    console.log(`====================================================`);
    console.log(`🔍 BẮT ĐẦU KIỂM TRA TIN NHẮN HÀNG LOẠT`);
    console.log(`- Server: ${CONFIG.BASE_URL}`);
    console.log(`- Tổng số email: ${emails.length}`);
    console.log(`- Chạy song song: ${CONFIG.CONCURRENCY}`);
    console.log(`====================================================\n`);

    const results = [];
    let completed = 0;
    let withMessages = 0;
    let withErrors = 0;
    const startTime = Date.now();

    const queue = [...emails];

    async function worker() {
        while (queue.length > 0) {
            const email = queue.shift();
            if (!email) break;

            const res = await getMessage(email);
            results.push(res);
            completed++;

            if (res.hasMessage) withMessages++;
            if (res.error) withErrors++;

            const progress = Math.round((completed / emails.length) * 100);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const speed = (completed / ((Date.now() - startTime) / 1000)).toFixed(0);

            process.stdout.write(
                `\rTiến độ: [${'#'.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${progress}% | ${completed}/${emails.length} | Có thư: ${withMessages} | ~${speed} email/s | ${elapsed}s`
            );
        }
    }

    const workers = Array.from({ length: CONFIG.CONCURRENCY }, worker);
    await Promise.all(workers);

    const totalDuration = Date.now() - startTime;

    // Lưu danh sách email có thư
    const emailsWithMessages = results.filter(r => r.hasMessage);
    fs.writeFileSync(
        CONFIG.OUTPUT_FILE,
        emailsWithMessages.map(r => r.email).join('\n'),
        'utf-8'
    );

    // Lưu chi tiết JSON
    fs.writeFileSync(
        CONFIG.OUTPUT_JSON,
        JSON.stringify(emailsWithMessages.map(r => ({
            email: r.email,
            messageCount: r.messageCount,
            latestSubject: r.latestSubject,
        })), null, 2),
        'utf-8'
    );

    console.log(`\n\n====================================================`);
    console.log(`📊 BÁO CÁO KẾT QUẢ`);
    console.log(`- Tổng thời gian: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`- Tốc độ: ${(emails.length / (totalDuration / 1000)).toFixed(0)} email/giây`);
    console.log(`- Tổng email đã kiểm tra: ${completed}`);
    console.log(`- Email CÓ thư: ${withMessages}`);
    console.log(`- Email KHÔNG có thư: ${completed - withMessages - withErrors}`);
    console.log(`- Email bị lỗi: ${withErrors}`);
    console.log(`\n💾 Kết quả đã lưu:`);
    console.log(`  - Danh sách email có thư: ${CONFIG.OUTPUT_FILE}`);
    console.log(`  - Chi tiết (JSON): ${CONFIG.OUTPUT_JSON}`);
    console.log(`====================================================`);
}

main().catch(console.error);
