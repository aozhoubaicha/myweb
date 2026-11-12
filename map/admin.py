import requests
import time

ip = "172.67.73.156"
url = "https://wplace.live"
vulnerable_paths = ["/admin", "/phpmyadmin", "/backup", "/.env"]
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36",
    "X-Forwarded-For": "192.168.1.1"
}

def check_path(path, target, use_ip=False):
    try:
        full_url = f"http://{target}{path}" if use_ip else f"{target}{path}"
        response = requests.get(full_url, headers=headers, timeout=5, allow_redirects=False)
        if response.status_code == 200:
            print(f"路径 {path} 可访问 (200 OK)")
            if "login" in response.text.lower():
                print("  可能为管理员入口")
            if "database" in response.text.lower():
                print("  可能暴露数据库")
        elif response.status_code == 403:
            print(f"路径 {path} 被禁止 (403 Forbidden) - Cloudflare或服务器限制")
        else:
            print(f"路径 {path} 状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"路径 {path} 访问失败: {e}")

def scan_vulnerabilities():
    print("尝试直连IP扫描...")
    for path in vulnerable_paths:
        check_path(path, ip, use_ip=True)
        time.sleep(3)
    print("\n尝试通过域名扫描...")
    for path in vulnerable_paths:
        check_path(path, url)
        time.sleep(3)

if __name__ == "__main__":
    print(f"扫描IP {ip} 和域名 {url}...")
    scan_vulnerabilities()
    print("扫描完成。建议：1. 检查服务器配置；2. 加密明文数据；3. 优化Cloudflare规则。")