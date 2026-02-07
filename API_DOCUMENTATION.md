# Tài liệu API TempFastMail

Hệ thống cung cấp API đơn giản để bạn có thể tự động hóa việc tạo email và nhận thư.

## 1. Base URL
```
https://domain-cua-ban.com
```

## 2. Các Endpoint chính

### 2.1. Tạo Hộp thư mới (Create Email Box)
Tạo một địa chỉ email ngẫu nhiên mới.

*   **URL:** `/api/email-box`
*   **Method:** `POST`
*   **Response (JSON):**
    ```json
    {
        "email": "random123@domain.com",
        "uuid": "a1b2c3d4-..."  <-- LƯU LẠI CÁI NÀY ĐỂ DÙNG SAU
    }
    ```

### 2.2. Lấy danh sách Email (Get Messages)
Lấy tất cả email đã gửi đến hộp thư đó.

*   **URL:** `/api/email-box/{emailBoxUuid}/emails`
*   **Method:** `GET`
*   **Parameters:**
    *   `emailBoxUuid`: Mã UUID nhận được ở bước 2.1.
*   **Response (JSON Array):**
    ```json
    [
        {
            "uuid": "msg-uuid-1",
            "from": "sender@gmail.com",
            "subject": "Test Email",
            "received_at": "2023-10-27T10:00:00+00:00"
        },
        ...
    ]
    ```

### 2.3. Đọc nội dung Email (Read Message)
Xem chi tiết nội dung (HTML) của một email cụ thể.

*   **URL:** `/api/email-box/{emailBoxUuid}/email/{emailUuid}`
*   **Method:** `GET`
*   **Parameters:**
    *   `emailBoxUuid`: Mã UUID của hộp thư.
    *   `emailUuid`: Mã UUID của tin nhắn (lấy từ bước 2.2).
*   **Response (JSON):**
    ```json
    {
        "uuid": "msg-uuid-1",
        "from": "sender@gmail.com",
        "subject": "Test Email",
        "html": "<h1>Hello World</h1>...",
        "received_at": "..."
    }
    ```

---

## 3. Ví dụ Python (Automated Testing)

Bạn có thể dùng đoạn code sau để tự động lấy email:

```python
import requests
import time

BASE_URL = "https://domain-cua-ban.com"

def get_temp_email():
    # 1. Tạo email mới
    resp = requests.post(f"{BASE_URL}/api/email-box")
    data = resp.json()
    print(f"📧 Email Created: {data['email']}")
    return data['email'], data['uuid']

def wait_for_email(box_uuid):
    # 2. Chờ email đến (Polling)
    print("⏳ Waiting for emails...")
    for _ in range(30): # Thử 30 lần, mỗi lần 2 giây
        resp = requests.get(f"{BASE_URL}/api/email-box/{box_uuid}/emails")
        emails = resp.json()
        
        if emails:
            print(f"📩 Received {len(emails)} email(s)!")
            return emails[0] # Trả về email mới nhất
            
        time.sleep(2)
        
    return None

def read_email_content(box_uuid, email_uuid):
    # 3. Đọc nội dung
    resp = requests.get(f"{BASE_URL}/api/email-box/{box_uuid}/email/{email_uuid}")
    return resp.json()
```
