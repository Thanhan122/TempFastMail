import argparse
import requests
import time
import threading
import random
import string
import sys

# Hướng dẫn sử dụng:
# python stress_test.py --url http://aczxmm.food --secret thanhan122 --threads 10 --count 100

def generate_random_string(length=10):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def send_request(target_url, secret_key, request_id):
    endpoint = f"{target_url}/api/email"
    
    # Tạo nội dung email giả lập
    random_user = generate_random_string(8)
    user_email = f"{random_user}@gmail.com"
    target_email = f"test{request_id}@aczxmm.food"
    
    # SỬA LỖI: real_from và real_to phải là STRING, không phải Object
    payload = {
        "real_from": user_email,
        "real_to": target_email,
        "subject": f"Load Test Email #{request_id} - {generate_random_string(5)}",
        "from_name": "Performance Tester",
        "from_address": user_email,
        "bcc_multiple": [],
        "to_multiple": [{
            "address": target_email, 
            "name": "Test User"
        }],
        "html": f"<h1>Test Email {request_id}</h1><p>Body content {generate_random_string(50)}</p>",
        "metadata": {}
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": secret_key,
        "Accept": "application/json"  # Thêm header này để chắc chắn nhận JSON
    }

    status = "UNKNOWN"
    try:
        # Tắt verify SSL nếu dùng https tự ký, nhưng ở đây dùng http nên không ảnh hưởng nhiều
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200 or response.status_code == 201:
            status = "SUCCESS"
            print(f"[{request_id}] {status} | Time: {response.elapsed.total_seconds():.3f}s")
            return True
        else:
            status = f"FAIL ({response.status_code})"
            # In ra 100 ký tự đầu của response để debug nếu lỗi
            print(f"[{request_id}] {status} | {response.text[:100].replace(chr(10), ' ')}")
            return False
            
    except Exception as e:
        print(f"[{request_id}] ERROR: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Stress Test TempFastMail Server")
    parser.add_argument("--url", type=str, required=True, help="URL của server (vd: http://aczxmm.food)")
    parser.add_argument("--secret", type=str, required=True, help="Secret Key trong docker-compose.yml")
    parser.add_argument("--threads", type=int, default=5, help="Số luồng chạy đồng thời")
    parser.add_argument("--count", type=int, default=20, help="Tổng số request muốn gửi")

    args = parser.parse_args()

    print(f"🚀 Bắt đầu Stress Test tới: {args.url}")
    print(f"👉 Tổng số request: {args.count}")
    print(f"👉 Số luồng: {args.threads}")
    print("-" * 50)

    start_total = time.time()
    
    # Sử dụng danh sách request index
    request_indices = list(range(1, args.count + 1))
    
    # Biến đếm thành công (dùng lock để an toàn thread)
    success_count = 0
    lock = threading.Lock()
    
    def worker():
        nonlocal success_count
        while True:
            try:
                # Lấy 1 request từ danh sách chung
                with lock:
                    if not request_indices:
                        break
                    idx = request_indices.pop(0)
                
                # Thực hiện gửi
                if send_request(args.url, args.secret, idx):
                    with lock:
                        success_count += 1
                        
            except IndexError:
                break

    # Khởi tạo threads
    threads = []
    for _ in range(args.threads):
        t = threading.Thread(target=worker)
        t.start()
        threads.append(t)

    # Đợi tất cả hoàn thành
    for t in threads:
        t.join()

    duration_total = time.time() - start_total
    
    print("-" * 50)
    print(f"✅ Hoàn thành!")
    print(f"⏱️ Tổng thời gian: {duration_total:.2f}s")
    if duration_total > 0:
        print(f"⚡ Tốc độ xử lý: {args.count/duration_total:.2f} request/s")
    print(f"📊 Tỷ lệ thành công: {success_count}/{args.count} ({success_count/args.count*100:.1f}%)" if args.count > 0 else "0%")

if __name__ == "__main__":
    main()
