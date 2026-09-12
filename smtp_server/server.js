const { SMTPServer } = require('smtp-server');
const { default: PostalMime } = require('postal-mime');
const http = require('http');

// ============================================================
// CẤU HÌNH
// ============================================================
const CONFIG = {
    // Port SMTP lắng nghe (25 = cổng tiêu chuẩn nhận mail từ Internet)
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '25'),

    // Địa chỉ API nội bộ của PHP Server (container name trong Docker Compose)
    API_URL: process.env.API_URL || 'http://tempfastmail:80/api/email',

    // Khóa xác thực khớp với CREATE_RECEIVED_EMAIL_API_AUTHORIZATION_KEY bên PHP
    AUTH_KEY: process.env.AUTH_KEY || 'leoteoteomailtemp',

    // Kích thước tối đa của email (10MB)
    MAX_SIZE: 10 * 1024 * 1024,
};

// ============================================================
// HÀM GỬI DỮ LIỆU VÀO API NỘI BỘ (dùng http thuần, không cần axios)
// ============================================================
function postToApi(payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const url = new URL(CONFIG.API_URL);

        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': CONFIG.AUTH_KEY,
                'Content-Length': Buffer.byteLength(data),
            },
            timeout: 10000,
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, body });
                } else {
                    reject(new Error(`API trả về lỗi ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('API request timeout'));
        });

        req.write(data);
        req.end();
    });
}

// ============================================================
// HÀM XỬ LÝ EMAIL THÔ (Tương đương logic trong Cloudflare Worker)
// ============================================================
async function processEmail(rawEmail, envelope) {
    try {
        const parser = new PostalMime();
        const email = await parser.parse(rawEmail);

        const realFrom = envelope.mailFrom?.address || email.from?.address || '';
        const realTo = envelope.rcptTo?.[0]?.address || '';

        // Xây dựng payload giống hệt Cloudflare Worker
        const payload = {
            real_from: realFrom,
            real_to: realTo,
            subject: email.subject || null,
            from_name: email.from?.name || null,
            from_address: email.from?.address || null,
            to_multiple: email.to || null,
            bcc_multiple: email.bcc || null,
            html: email.html || null,
            metadata: email,
        };

        console.log(`📩 [${new Date().toISOString()}] Mail từ: ${realFrom} -> ${realTo} | Subject: "${email.subject || '(trống)'}"`);

        const result = await postToApi(payload);
        console.log(`   ✅ API phản hồi: ${result.status}`);
    } catch (err) {
        console.error(`   ❌ Lỗi xử lý email:`, err.message);
    }
}

// ============================================================
// KHỞI TẠO SMTP SERVER
// ============================================================
const server = new SMTPServer({
    // Không yêu cầu xác thực (vì đây là mail server nhận inbound từ Internet)
    authOptional: true,
    disabledCommands: ['AUTH'],

    // Không yêu cầu STARTTLS (mail từ thế giới gửi vào thường không cần TLS)
    secure: false,
    disableReverseLookup: true,

    // Giới hạn kích thước
    size: CONFIG.MAX_SIZE,

    // Chấp nhận mọi kết nối đến
    onConnect(session, callback) {
        console.log(`🔗 [${new Date().toISOString()}] Kết nối SMTP từ: ${session.remoteAddress}`);
        callback(); // Chấp nhận
    },

    // Chấp nhận mọi người gửi
    onMailFrom(address, session, callback) {
        callback();
    },

    // Chấp nhận mọi người nhận
    onRcptTo(address, session, callback) {
        callback();
    },

    // Xử lý dữ liệu email
    onData(stream, session, callback) {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', async () => {
            const rawEmail = Buffer.concat(chunks);

            // Xử lý email bất đồng bộ (không block luồng SMTP)
            processEmail(rawEmail, {
                mailFrom: session.envelope.mailFrom,
                rcptTo: session.envelope.rcptTo,
            }).catch((err) => {
                console.error('❌ processEmail failed:', err.message);
            });

            // Phản hồi SMTP ngay lập tức (250 OK)
            callback();
        });
    },

    // Log lỗi
    onError(err) {
        console.error('❌ SMTP Server Error:', err.message);
    },
});

// ============================================================
// KHỞI ĐỘNG
// ============================================================
server.listen(CONFIG.SMTP_PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`🚀 SMTP Receiver đã khởi động!`);
    console.log(`   Port: ${CONFIG.SMTP_PORT}`);
    console.log(`   API:  ${CONFIG.API_URL}`);
    console.log(`   Auth: ${CONFIG.AUTH_KEY.substring(0, 5)}...`);
    console.log('====================================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Đang tắt SMTP Server...');
    server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
    console.log('🛑 Đang tắt SMTP Server...');
    server.close(() => process.exit(0));
});
