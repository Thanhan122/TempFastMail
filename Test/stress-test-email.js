const axios = require('axios');

const CONFIG = {
    // Địa chỉ server của bạn
    BASE_URL: 'https://caughtin4k.online',
    // Key Authorization khớp với server
    AUTH_KEY: 'leoteoteomailtemp',
    // Số lượng request chạy song song cùng lúc
    CONCURRENCY: 300,
    // Tổng số email test sẽ gửi
    TOTAL_REQUESTS: 1000,
    // Thời gian chờ tối đa (ms)
    TIMEOUT: 30000
};

/**
 * Luồng test một chu kỳ: Tạo box (lấy email) -> Gửi mail -> Đọc mail (dùng /{email}/message)
 */
async function runTest(id) {
    const start = Date.now();
    try {
        const axiosConfig = { timeout: CONFIG.TIMEOUT };

        // 1. Tạo Email Box (Client tạo) -> Lấy được địa chỉ email
        const boxRes = await axios.post(`${CONFIG.BASE_URL}/api/email-box`, {}, axiosConfig);
        const { email } = boxRes.data;

        if (!email) {
            throw new Error('API /api/email-box không trả về email');
        }

        // 2. Giả lập nhận Mail OTP (Worker gửi tới VPS)
        // Format: "123456 là mã xác minh của bạn"
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

        // 3. Đọc tin nhắn (Sử dụng Endpoint mới: /{email}/message)
        // Không dùng UUID nữa, chỉ dùng email trực tiếp
        const listRes = await axios.get(`${CONFIG.BASE_URL}/${email}/message`, axiosConfig);

        if (!listRes.data || listRes.data.length === 0) {
            throw new Error('Không tìm thấy email qua endpoint /{email}/message');
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
    console.log(`🚀 BẮT ĐẦU STRESS TEST MAIL SERVER (V2 - EMAIL LOOKUP)`);
    console.log(`- Server: ${CONFIG.BASE_URL}`);
    console.log(`- Endpoint test: GET /{email}/message`);
    console.log(`- Tổng số lượt test: ${CONFIG.TOTAL_REQUESTS}`);
    console.log(`- Chạy song song (Concurrency): ${CONFIG.CONCURRENCY}`);
    console.log(`====================================================\n`);

    const results = [];
    let completed = 0;
    const taskQueue = Array.from({ length: CONFIG.TOTAL_REQUESTS }, (_, i) => i);

    async function worker() {
        while (taskQueue.length > 0) {
            const id = taskQueue.shift();
            const res = await runTest(id);
            results.push(res);
            completed++;

            const progress = Math.round((completed / CONFIG.TOTAL_REQUESTS) * 100);
            process.stdout.write(`\rTiến độ: [${'#'.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${progress}% (${completed}/${CONFIG.TOTAL_REQUESTS})`);
        }
    }

    const startTime = Date.now();
    const workers = Array.from({ length: CONFIG.CONCURRENCY }, worker);
    await Promise.all(workers);
    const totalDuration = Date.now() - startTime;

    const successCount = results.filter(r => r.success).length;
    const durations = results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / results.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log(`\n\n====================================================`);
    console.log(`📊 BÁO CÁO KẾT QUẢ (V2)`);
    console.log(`- Thành công: ${successCount}/${CONFIG.TOTAL_REQUESTS} (${((successCount / CONFIG.TOTAL_REQUESTS) * 100).toFixed(1)}%)`);
    console.log(`- Thất bại: ${CONFIG.TOTAL_REQUESTS - successCount}`);
    console.log(`- Tổng thời gian chạy: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`- Tốc độ xử lý: ${(CONFIG.TOTAL_REQUESTS / (totalDuration / 1000)).toFixed(2)} chu kỳ/giây`);
    console.log(`- Độ trễ phản hồi (Latency):`);
    console.log(`  + Nhanh nhất: ${minDuration}ms`);
    console.log(`  + Chậm nhất: ${maxDuration}ms`);
    console.log(`  + Trung bình: ${avgDuration.toFixed(2)}ms`);

    const failures = results.filter(r => !r.success);
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
