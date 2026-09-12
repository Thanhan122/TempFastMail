const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    // Địa chỉ server
    BASE_URL: 'https://caughtin4k.online',
    // File chứa danh sách email (mỗi dòng 1 email)
    MAIL_FILE: path.join(__dirname, '..', 'mail.txt'),
    // Số lượng email gửi trong mỗi batch request (giảm tải cho DB)
    BATCH_SIZE: 100,
    // Số lượng batch request chạy song song cùng lúc
    CONCURRENCY: 200,
    // Thời gian chờ tối đa cho mỗi batch (ms)
    TIMEOUT: 60000,
};

function loadEmails() {
    const raw = fs.readFileSync(CONFIG.MAIL_FILE, 'utf-8');
    const emails = raw
        .split(/\r?\n/)
        .map(line => line.trim().toLowerCase())
        .filter(line => line.length > 0 && line.includes('@'));

    // Loại bỏ trùng lặp
    const unique = [...new Set(emails)];
    console.log(`📧 Đọc được ${emails.length} email, sau khi loại trùng: ${unique.length}`);
    return unique;
}

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

async function sendBatch(batch, batchIndex) {
    const start = Date.now();
    try {
        const response = await axios.post(
            `${CONFIG.BASE_URL}/api/email-box/batch`,
            { emails: batch },
            { timeout: CONFIG.TIMEOUT, headers: { 'Content-Type': 'application/json' } }
        );
        const duration = Date.now() - start;
        return {
            success: true,
            created: response.data.created || 0,
            total: response.data.total || batch.length,
            duration,
            batchIndex
        };
    } catch (error) {
        const duration = Date.now() - start;
        return {
            success: false,
            error: error.response ? `${error.response.status} ${error.response.statusText}` : error.message,
            total: batch.length,
            created: 0,
            duration,
            batchIndex
        };
    }
}

async function main() {
    const emails = loadEmails();

    if (emails.length === 0) {
        console.log('❌ Không tìm thấy email nào trong file!');
        return;
    }

    const batches = chunkArray(emails, CONFIG.BATCH_SIZE);

    console.log(`====================================================`);
    console.log(`🚀 BẮT ĐẦU TẠO MAIL HÀNG LOẠT`);
    console.log(`- Server: ${CONFIG.BASE_URL}`);
    console.log(`- Tổng số email: ${emails.length}`);
    console.log(`- Số batch: ${batches.length} (mỗi batch ${CONFIG.BATCH_SIZE} email)`);
    console.log(`- Chạy song song: ${CONFIG.CONCURRENCY} batch cùng lúc`);
    console.log(`====================================================\n`);

    const results = [];
    let completed = 0;
    let totalCreated = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    // Tạo hàng đợi batch
    const queue = batches.map((batch, i) => ({ batch, index: i }));

    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift();
            if (!item) break;

            const res = await sendBatch(item.batch, item.index);
            results.push(res);
            completed++;

            if (res.success) {
                totalCreated += res.created;
            } else {
                totalFailed += res.total;
            }

            const progress = Math.round((completed / batches.length) * 100);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const emailsDone = completed * CONFIG.BATCH_SIZE;
            const speed = (emailsDone / ((Date.now() - startTime) / 1000)).toFixed(0);

            process.stdout.write(
                `\rTiến độ: [${'#'.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${progress}% | Batch ${completed}/${batches.length} | ~${speed} email/s | ${elapsed}s`
            );
        }
    }

    // Chạy song song
    const workers = Array.from({ length: CONFIG.CONCURRENCY }, worker);
    await Promise.all(workers);

    const totalDuration = Date.now() - startTime;
    const failedBatches = results.filter(r => !r.success);

    console.log(`\n\n====================================================`);
    console.log(`📊 BÁO CÁO KẾT QUẢ`);
    console.log(`- Tổng thời gian: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`- Tổng email đã tạo: ${totalCreated}/${emails.length}`);
    console.log(`- Tốc độ: ${(emails.length / (totalDuration / 1000)).toFixed(0)} email/giây`);
    console.log(`- Batch thành công: ${results.filter(r => r.success).length}/${batches.length}`);
    console.log(`- Batch thất bại: ${failedBatches.length}`);

    if (failedBatches.length > 0) {
        console.log(`\n⚠️ CÁC LỖI GẶP PHẢI (Top 5):`);
        const errorSummary = {};
        failedBatches.forEach(f => {
            errorSummary[f.error] = (errorSummary[f.error] || 0) + 1;
        });
        Object.entries(errorSummary).slice(0, 5).forEach(([err, count]) => {
            console.log(`  - ${err}: ${count} lần`);
        });

        // Lưu lại các email lỗi để retry sau
        const failedEmails = [];
        failedBatches.forEach(fb => {
            const batch = batches[fb.batchIndex];
            if (batch) failedEmails.push(...batch);
        });

        if (failedEmails.length > 0) {
            const failedFile = path.join(__dirname, 'mail_failed.txt');
            fs.writeFileSync(failedFile, failedEmails.join('\n'), 'utf-8');
            console.log(`\n💾 Đã lưu ${failedEmails.length} email lỗi vào: ${failedFile}`);
        }
    }

    console.log(`====================================================`);
}

main().catch(console.error);
