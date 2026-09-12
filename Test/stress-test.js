const axios = require('axios');

const CONFIG = {
    // Địa chỉ server của bạn (Sửa thành http nếu VPS chưa có HTTPS)
    BASE_URL: 'https://caughtin4k.online',
    // Key rút gọn mà chúng ta đã thống nhất
    AUTH_KEY: 'leoteoteomailtemp',
    // Số lượng request chạy song song cùng lúc (Khuyên dùng: 50-200 cho VPS cấu hình thấp)
    CONCURRENCY: 300,
    // Tổng số email test sẽ gửi
    TOTAL_REQUESTS: 1000,
    // Thời gian chờ tối đa (ms)
    TIMEOUT: 30000
};

/**
 * Luồng test một chu kỳ: Tạo box -> Gửi mail -> Đọc mail -> Lấy OTP
 */
async function runTest(id) {
    const start = Date.now();
    try {
        const axiosConfig = { timeout: CONFIG.TIMEOUT };

        // 1. Tạo Email Box (Client tạo)
        const boxRes = await axios.post(`${CONFIG.BASE_URL}/api/email-box`, {}, axiosConfig);
        const { uuid, email } = boxRes.data;

        // 2. Giả lập nhận Mail OTP (Worker gửi tới VPS)
        // Chúng ta giả định format của TikTok: "123456 là mã xác minh của bạn"
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await axios.post(`${CONFIG.BASE_URL}/api/email`, {
            real_from: 'noreply@account.tiktok.com',
            real_to: email,
            subject: `${otp} là mã xác minh của bạn`,
            from_name: 'TikTok',
            from_address: 'noreply@account.tiktok.com',
            html: `Your verification code is <b>${otp}</b>`,
            metadata: {}
        }, {
            headers: { 'Authorization': CONFIG.AUTH_KEY },
            ...axiosConfig
        });

        // 3. Đọc danh sách Mail để lấy OTP (Client polling)
        const listRes = await axios.get(`${CONFIG.BASE_URL}/api/email-box/${uuid}/emails`, axiosConfig);

        if (!listRes.data || listRes.data.length === 0) {
            throw new Error('Không tìm thấy email sau khi gửi');
        }

        const latestMail = listRes.data[0];
        const receivedOtp = latestMail.subject.split(' ')[0];

        const duration = Date.now() - start;
        if (receivedOtp === otp) {
            return { success: true, duration, otp };
        } else {
            return { success: false, error: `Lệch OTP: Expect ${otp} but got ${receivedOtp}`, duration };
        }
    } catch (error) {
        return {
            success: false,
            error: error.response ? `${error.response.status} ${error.response.statusText}` : error.message,
            duration: Date.now() - start
        };
    }
}

async function startStressTest() {
    console.log(`====================================================`);
    console.log(`🚀 BẮT ĐẦU STRESS TEST MAIL SERVER`);
    console.log(`- Server: ${CONFIG.BASE_URL}`);
    console.log(`- Tổng số lượt test: ${CONFIG.TOTAL_REQUESTS}`);
    console.log(`- Chạy song song (Concurrency): ${CONFIG.CONCURRENCY}`);
    console.log(`====================================================\n`);

    const results = [];
    const queue = Array.from({ length: CONFIG.TOTAL_REQUESTS }, (_, i) => i);
    let completed = 0;

    async function worker() {
        while (queue.length > 0) {
            const id = queue.shift();
            const res = await runTest(id);
            results.push(res);
            completed++;

            // Vẽ tiến độ
            const progress = Math.round((completed / CONFIG.TOTAL_REQUESTS) * 100);
            process.stdout.write(`\rTiến độ: [${'#'.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${progress}% (${completed}/${CONFIG.TOTAL_REQUESTS})`);

            if (!res.success) {
                // console.log(`\n❌ Lỗi tại req #${id}: ${res.error}`);
            }
        }
    }

    const startTime = Date.now();
    const workers = Array.from({ length: CONFIG.CONCURRENCY }, worker);
    await Promise.all(workers);
    const totalDuration = Date.now() - startTime;

    // Tính toán thống kê
    const successCount = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success);
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / results.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log(`\n\n====================================================`);
    console.log(`📊 BÁO CÁO KẾT QUẢ`);
    console.log(`- Thành công: ${successCount}/${CONFIG.TOTAL_REQUESTS} (${((successCount / CONFIG.TOTAL_REQUESTS) * 100).toFixed(1)}%)`);
    console.log(`- Thất bại: ${CONFIG.TOTAL_REQUESTS - successCount}`);
    console.log(`- Tổng thời gian chạy: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`- Tốc độ xử lý: ${(CONFIG.TOTAL_REQUESTS / (totalDuration / 1000)).toFixed(2)} requests/giây`);
    console.log(`- Độ trễ phản hồi (Latency):`);
    console.log(`  + Nhanh nhất: ${minDuration}ms`);
    console.log(`  + Chậm nhất: ${maxDuration}ms`);
    console.log(`  + Trung bình: ${avgDuration.toFixed(2)}ms`);

    if (failures.length > 0) {
        console.log(`\n⚠️ CÁC LỖI GẶP PHẢI (Top 5):`);
        const errorSummary = {};
        failures.forEach(f => {
            errorSummary[f.error] = (errorSummary[f.error] || 0) + 1;
        });
        Object.entries(errorSummary).slice(0, 5).forEach(([err, count]) => {
            console.log(`  - ${err}: ${count} lần`);
        });
    }
    console.log(`====================================================`);
}

startStressTest();
