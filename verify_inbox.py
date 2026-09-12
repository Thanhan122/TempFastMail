import requests
import time
import argparse
import sys

def verify_inbox(base_url, target_domain):
    print(f"🚀 Bắt đầu quá trình kiểm tra nhận mail cho domain: {target_domain}")
    
    # Bước 1: Tạo hòm thư mới
    res = requests.post(f"{base_url}/api/email-box", json={"domain": target_domain})
    if res.status_code != 200:
        print(f"❌ Không thể tạo hòm thư: {res.text}")
        return

    data = res.json()
    email = data.get('email')
    uuid = data.get('uuid')
    
    print("-" * 50)
    print(f"📧 EMAIL CỦA BẠN: {email}")
    print(f"🔑 UUID: {uuid}")
    print("-" * 50)
    print(f"👉 HÀNH ĐỘNG: Bây giờ hãy lấy Gmail hoặc Outlook của bạn,")
    print(f"   gửi 1 email bất kỳ tới địa chỉ: {email}")
    print("-" * 50)
    print("⏳ Đang chờ email đến (tự động kiểm tra mỗi 3 giây)...")

    # Bước 2: Polling chờ mail
    emails_url = f"{base_url}/api/email-box/{uuid}/emails"
    
    try:
        while True:
            response = requests.get(emails_url)
            if response.status_code == 200:
                mail_list = response.json()
                if mail_list:
                    print(f"\n🎉 PHÁT HIỆN CÓ EMAIL MỚI! ({len(mail_list)} mail)")
                    for m in mail_list:
                        print(f"📍 Từ: {m.get('from_address')}")
                        print(f"📍 Tiêu đề: {m.get('subject')}")
                        print(f"📍 Thời gian: {m.get('created_at')}")
                        print("-" * 30)
                    print("\n✅ KIỂM TRA ĐÃ HOÀN TẤT THÀNH CÔNG!")
                    break
            
            sys.stdout.write(".")
            sys.stdout.flush()
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\n🛑 Đã dừng kiểm tra.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://aczxmm.food")
    parser.add_argument("--domain", required=True)
    args = parser.parse_args()
    
    verify_inbox(args.url, args.domain)
