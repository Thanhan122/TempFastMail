# Hướng dẫn Triển khai TempFastMail (Phiên bản Đa Tên Miền - Đã Sửa Lỗi)

Tài liệu này hướng dẫn quy trình chuẩn để triển khai hệ thống Email 10s (TempFastMail) từ **Mã nguồn (Source Code)** hiện có lên VPS. Phương pháp này đảm bảo bạn có đầy đủ các bản sửa lỗi mới nhất (như chuẩn hóa chữ thường, nhận mail đa domain).

## Phần 1: Chuẩn bị VPS & Tên miền
1.  **VPS:** Ubuntu 20.04/22.04 (1 Core, 1GB RAM).
2.  **Cloudflare:** Mọi tên miền muốn dùng làm mail đều phải được thêm vào Cloudflare.
3.  **DNS (Quan trọng):** Với mỗi domain (ví dụ `domain1.com`, `domain2.com`), bạn phải tạo một bản ghi **A** trỏ về IP của VPS.

---

## Phần 2: Cài đặt Server (Triển khai từ Source Code)

### Bước 1: Cài đặt Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Bước 2: Chuẩn bị Source Code trên VPS
1.  Tạo thư mục chính: `mkdir -p /root/tempmail && cd /root/tempmail`
2.  Upload toàn bộ mã nguồn hiện tại vào thư mục này (bao gồm thư mục `src`, `assets`, `frankenphp`, `Dockerfile`,...).
3.  Cấu hình file `docker-compose.custom.yml`:
    ```yaml
    services:
      tempfastmail:
        container_name: tempfastmail
        build:
          context: .
          target: frankenphp_prod
        restart: unless-stopped
        environment:
          APP_SECRET: "chuoi-ngau-nhien-bi-mat"
          # Khớp với mã Authorization trong Cloudflare Worker
          CREATE_RECEIVED_EMAIL_API_AUTHORIZATION_KEY: "xxxxxxx" 
          # Domain chính (Nếu dùng HTTPS trên Cloudflare, hãy để https://)
          DEFAULT_URI: "http://domain.com" 
          DATABASE_URL: "sqlite:///%kernel.project_dir%/sqlite/data.db"
        ports:
          - "80:80"
        volumes:
          - ./sqlite:/app/sqlite
    ```

### Bước 3: Build và Khởi chạy
```bash
docker compose -f docker-compose.custom.yml up -d --build
```
*Lưu ý: Quá trình build lần đầu có thể mất 3-5 phút.*

---

## Phần 3: Cấu hình Cloudflare (Bắt buộc)

### 1. Thiết lập SSL/TLS
*   **SSL/TLS -> Overview:** Chọn chế độ **Flexible**.
*   **SSL/TLS -> Edge Certificates:** **TẮT** mục `Always Use HTTPS` (Nếu bạn muốn dùng URL bắt đầu bằng `http://`). Nếu bật, hãy đảm bảo `DEFAULT_URI` trong server là `https://`.

### 2. Cấu hình Email Routing (Làm cho từng domain)
1.  Vào Dashboard domain -> **Email** -> **Email Routing**.
2.  Bật (Enable) Email Routing.
3.  Tab **Routing rules** -> **Catch-all address**:
    *   Action: **Send to a Worker**.
    *   Destination: Chọn Worker `forwarder-worker` (Xem Phần 4).

---

## Phần 4: Cloudflare Worker Đa Miền (Thông minh)
Sử dụng mã dưới đây cho Worker của bạn để hỗ trợ không giới hạn số lượng domain mà không cần sửa code.

**Mã nguồn Worker (`index.js`):**
```javascript
import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    const parser = new PostalMime();
    const rawEmail = new Response(message.raw);
    const email = await parser.parse(await rawEmail.arrayBuffer());
    
    // Tự động nhận diện domain người nhận (ví dụ: test@aqamn.food -> aqamn.food)
    const domain = message.to.split('@')[1];
    
    // Gửi dữ liệu về server của bạn theo đúng domain đó
    const response = await fetch(`http://${domain}/api/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "thanhan122" // PHẢI KHỚP VỚI SERVER
      },
      body: JSON.stringify({
        real_from: message.from,
        real_to: message.to,
        subject: email.subject,
        from_name: email.from.name,
        from_address: email.from.address,
        bcc_multiple: email.bcc,
        to_multiple: email.to,
        html: email.html,
        metadata: email
      })
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} - ${await response.text()}`);
    }
  }
};
```

---

## Phần 5: Quản trị (Admin)
1.  Truy cập `http://ten-mien-cua-ban.com/admin` (Mặc định: `admin@admin.dev` / `admin`).
2.  Vào mục **Domains** -> Thêm tất cả các tên miền bạn đã cấu hình trên Cloudflare.
3.  Hệ thống sẽ tự động lọc và hiển thị email theo đúng hòm thư đã tạo.

---

## Hết lỗi chập chờn! ✅
*   **Case-Sensitivity:** Server đã được sửa để tự động chuyển email về chữ thường.
*   **Multi-domain:** Worker tự phát hiện domain và gửi về đúng IP server.
*   **SSL 521:** Đã xử lý bằng cách dùng cổng 80 và chế độ Flexible.
