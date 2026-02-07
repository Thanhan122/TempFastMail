import requests
import argparse
import sys

def test_custom_domain(base_url, target_domain):
    print(f"🔄 Đang thử tạo tài khoản với domain: {target_domain}")
    print(f"👉 URL: {base_url}/api/email-box")
    
    try:
        # Gửi request có kèm domain
        response = requests.post(f"{base_url}/api/email-box", json={
            "domain": target_domain
        })
        
        if response.status_code == 200:
            data = response.json()
            email = data.get('email')
            print(f"✅ Thành công! Email được tạo: {email}")
            
            if target_domain in email:
                print("🎉 CHÍNH XÁC! Email đã theo đúng domain yêu cầu.")
                return True
            else:
                print("⚠️ CẢNH BÁO: Email được tạo nhưng sai domain (Có thể do domain kia không Active hoặc code chưa nhận).")
                return False
        else:
            print(f"❌ Thất bại! Code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://aczxmm.food")
    parser.add_argument("--domain", required=True, help="Tên domain muốn test (phải đang Active trong Admin)")
    args = parser.parse_args()
    
    test_custom_domain(args.url, args.domain)
