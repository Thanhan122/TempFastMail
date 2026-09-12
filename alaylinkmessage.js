const axios = require('axios');

function extractOtpAndLink(content) {
    if (!content) {
        return null;
    }

    const shopeeMatch = content.match(/tw\.shp\.ee\/dlink\/[a-zA-Z0-9]+/i);
    const genericLinkMatch = content.match(/https?:\/\/[^\s"'<>]+/i);
    const otpMatch = content.match(/(?<!\d)\d{6}(?!\d)/);

    const link = shopeeMatch
        ? `https://${shopeeMatch[0]}`
        : genericLinkMatch
            ? genericLinkMatch[0]
            : null;

    if (!otpMatch && !link) {
        return null;
    }

    return {
        otp: otpMatch ? otpMatch[0] : null,
        link,
    };
}

async function scanMessage(email) {
    const BASE_URL = 'http://caughtin4k.online';

    // 1. Gọi API lấy danh sách thư của email đó
    const listRes = await axios.get(`${BASE_URL}/${email}/message`);
    const messages = listRes.data;

    if (!messages || messages.length === 0) return null;

    // Duyệt qua tất cả các bức thư của email này
    for (const msg of messages) {
        const messageUuid = msg.uuid;
        console.log(`Đang quét thư ID: ${messageUuid}...`);

        try {
            // 2. Gọi API LẤY CHI TIẾT
            const detailRes = await axios.get(`${BASE_URL}/api/email-box/${email}/email-by-address/${messageUuid}`);
            const fullHtml = detailRes.data.html;

            // 3. Quét OTP 6 số và link nếu có
            const extracted = extractOtpAndLink(fullHtml);
            if (extracted) {
                if (extracted.otp) {
                    console.log(`OTP tìm thấy: ${extracted.otp}`);
                }
                if (extracted.link) {
                    console.log(`Link trích xuất được: ${extracted.link}`);
                }
                return extracted;
            }
        } catch (e) {
            console.error(`Lỗi khi đọc thư ${messageUuid}:`, e.message);
        }
    }

    console.log("Không tìm thấy OTP 6 số hoặc link trong hòm thư.");
    return null;
}

// Chạy thử với email bạn vừa cung cấp
scanMessage('thompson.donald.1997@sigmawalk.asia');

