const axios = require('axios');

const CONFIG = {
    // Chạy nội bộ trên VPS nên dùng localhost (không tốn độ trễ mạng)
    BASE_URL: 'http://localhost',
    AUTH_KEY: 'leoteoteomailtemp',
    CONCURRENCY: 100,
    TOTAL_REQUESTS: 1000,
    TIMEOUT: 60000
};

async function runTest(id) {
    const start = Date.now();
    try {
        const axiosConfig = { timeout: CONFIG.TIMEOUT };
        const boxRes = await axios.post(`${CONFIG.BASE_URL}/api/email-box`, {}, axiosConfig);
        const { uuid, email } = boxRes.data;

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

        const listRes = await axios.get(`${CONFIG.BASE_URL}/api/email-box/${uuid}/emails`, axiosConfig);
        const latestMail = listRes.data[0];
        const receivedOtp = latestMail.subject.split(' ')[0];

        const duration = Date.now() - start;
        if (receivedOtp === otp) {
            return { success: true, duration, otp };
        } else {
            return { success: false, error: `Lệch OTP`, duration };
        }
    } catch (error) {
        return {
            success: false,
            error: error.response ? `${error.response.status}` : error.message,
            duration: Date.now() - start
        };
    }
}

async function startStressTest() {
    console.log(`🚀 BẮT ĐẦU LOCAL STRESS TEST (Vượt qua Network & HTTPS)`);
    console.log(`- Concurrency: ${CONFIG.CONCURRENCY}, Total: ${CONFIG.TOTAL_REQUESTS}\n`);

    const results = [];
    const queue = Array.from({ length: CONFIG.TOTAL_REQUESTS }, (_, i) => i);
    let completed = 0;

    async function worker() {
        while (queue.length > 0) {
            const id = queue.shift();
            const res = await runTest(id);
            results.push(res);
            completed++;
            process.stdout.write(`\rTiến độ: ${Math.round((completed / CONFIG.TOTAL_REQUESTS) * 100)}% (${completed}/${CONFIG.TOTAL_REQUESTS})`);
        }
    }

    const startTime = Date.now();
    await Promise.all(Array.from({ length: CONFIG.CONCURRENCY }, worker));
    const totalDuration = Date.now() - startTime;

    const successCount = results.filter(r => r.success).length;
    console.log(`\n\n📊 KẾT QUẢ LOCAL TEST:`);
    console.log(`- Thành công: ${successCount}/${CONFIG.TOTAL_REQUESTS}`);
    console.log(`- Tốc độ xử lý: ${(CONFIG.TOTAL_REQUESTS / (totalDuration / 1000)).toFixed(2)} req/s`);
    console.log(`- Độ trễ trung bình: ${(results.reduce((a, b) => a + b.duration, 0) / results.length).toFixed(2)}ms`);
}

startStressTest();
