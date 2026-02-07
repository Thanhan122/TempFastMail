import requests
import time
import sys

# CẤU HÌNH CỦA BẠN
BASE_URL = "http://aczxmm.food"  # Thay bằng domain của bạn (http hoặc https)

def create_email_box():
    """Tạo một hộp thư tạm thời mới"""
    print(f"🔄 Đang tạo hộp thư mới tại {BASE_URL}...")
    try:
        response = requests.post(f"{BASE_URL}/api/email-box")
        if response.status_code == 200:
            data = response.json()
            email = data.get('email')
            uuid = data.get('uuid')
            print(f"✅ Đã tạo thành công!")
            print(f"📧 Email: {email}")
            print(f"🔑 UUID:  {uuid}")
            return email, uuid
        else:
            print(f"❌ Lỗi tạo email: {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        return None, None

def check_mailbox(email_box_uuid):
    """Kiểm tra xem có email mới không"""
    try:
        url = f"{BASE_URL}/api/email-box/{email_box_uuid}/emails"
        response = requests.get(url)
        if response.status_code == 200:
            emails = response.json()
            return emails
        return []
    except Exception as e:
        print(f"❌ Lỗi kiểm tra hộp thư: {e}")
        return []

def get_email_content(email_box_uuid, message_uuid):
    """Đọc nội dung chi tiết của một email"""
    try:
        url = f"{BASE_URL}/api/email-box/{email_box_uuid}/email/{message_uuid}"
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
        return None
    except Exception:
        return None

def main():
    print("--- DEMO SỬ DỤNG API TEMPFASTMAIL ---")
    
    # 1. Tạo hộp thư
    my_email, my_uuid = create_email_box()
    if not my_email:
        return

    print("\n👉 Bây giờ hãy thử gửi một email đến địa chỉ trên!")
    print("(Bạn có 60 giây để gửi thử...)")
    
    # 2. Vòng lặp chờ email đến (Polling)
    for i in range(30):
        sys.stdout.write(f"\r⏳ Đang chờ email... ({i*2}s)")
        sys.stdout.flush()
        
        emails = check_mailbox(my_uuid)
        
        if emails:
            print("\n\n🎉 CÓ GÌ ĐÓ VỪA ĐẾN! 🎉")
            print(f"Số lượng email: {len(emails)}")
            
            # 3. Đọc email mới nhất
            latest_email = emails[0]
            msg_uuid = latest_email.get('uuid')
            subject = latest_email.get('subject')
            sender = latest_email.get('from')
            
            print(f"📨 Tiêu đề: {subject}")
            print(f"👤 Từ:     {sender}")
            
            # Lấy nội dung full
            full_content = get_email_content(my_uuid, msg_uuid)
            if full_content:
                print(f"📜 Nội dung (HTML): {full_content.get('html')[:100]}...") # In 100 ký tự đầu
            
            break
            
        time.sleep(2)
    else:
        print("\n\n⏰ Hết thời gian chờ! Hãy thử chạy lại script và gửi nhanh hơn nhé.")

if __name__ == "__main__":
    main()
