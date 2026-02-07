import argparse
import requests
import time
import threading
import sys

# Hướng dẫn sử dụng:
# python stress_test_creation.py --url http://aczxmm.food --threads 10 --count 100

def create_account(target_url, request_id):
    endpoint = f"{target_url}/api/email-box"
    
    start_time = time.time()
    status = "UNKNOWN"
    try:
        response = requests.post(endpoint, timeout=10)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            status = "SUCCESS"
            data = response.json()
            email = data.get('email', 'N/A')
            # print(f"[{request_id}] {status} | {email} | Time: {elapsed:.3f}s")
            return True
        else:
            status = f"FAIL ({response.status_code})"
            print(f"[{request_id}] {status} | {response.text[:100].replace(chr(10), ' ')}")
            return False
            
    except Exception as e:
        print(f"[{request_id}] ERROR: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Stress Test Account Creation")
    parser.add_argument("--url", type=str, required=True, help="URL của server (vd: http://aczxmm.food)")
    parser.add_argument("--threads", type=int, default=10, help="Số luồng chạy đồng thời")
    parser.add_argument("--count", type=int, default=100, help="Tổng số tài khoản muốn tạo")

    args = parser.parse_args()

    print(f"🚀 Bắt đầu Stress Test TẠO TÀI KHOẢN tới: {args.url}")
    print(f"👉 Tổng số request: {args.count}")
    print(f"👉 Số luồng: {args.threads}")
    print("-" * 50)

    start_total = time.time()
    
    request_indices = list(range(1, args.count + 1))
    success_count = 0
    lock = threading.Lock()
    
    def worker():
        nonlocal success_count
        while True:
            try:
                with lock:
                    if not request_indices:
                        break
                    idx = request_indices.pop(0)
                
                if create_account(args.url, idx):
                    with lock:
                        success_count += 1
                        
            except IndexError:
                break

    threads = []
    for _ in range(args.threads):
        t = threading.Thread(target=worker)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    duration_total = time.time() - start_total
    
    print("-" * 50)
    print(f"✅ Hoàn thành!")
    print(f"⏱️ Tổng thời gian: {duration_total:.2f}s")
    if duration_total > 0:
        print(f"⚡ Tốc độ xử lý: {args.count/duration_total:.2f} request/s (Acc/s)")
    print(f"📊 Tỷ lệ thành công: {success_count}/{args.count} ({success_count/args.count*100:.1f}%)" if args.count > 0 else "0%")

if __name__ == "__main__":
    main()
