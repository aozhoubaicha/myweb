import requests
import json
import queue
import time
import os
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote
from ratelimit import limits, sleep_and_retry
from typing import Optional, Dict, List, Tuple
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 用于保存结果和进度的文件
RESULTS_FILE = "search_results.json"
PROGRESS_FILE = "search_progress.json"

# API 请求速率限制（每分钟 60 次）
CALLS = 60
RATE_LIMIT = 60
QUERY_INTERVAL = 0.1  # 每次查询间隔 0.1 秒

# 伪装浏览器的 headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive"
}

# 可选：配置代理（替换为你的代理地址）
PROXIES = {
    "http": "http://your_proxy_username:your_proxy_password@your_proxy_host:port",
    "https": "https://your_proxy_username:your_proxy_password@your_proxy_host:port"
}

@sleep_and_retry
@limits(calls=CALLS, period=RATE_LIMIT)
def fetch_pixel_data(region_id: int, layer_id: int, x: int, y: int) -> Optional[Dict]:
    """
    根据给定的地区编号、图层编号和坐标从 API 获取像素数据。
    返回 JSON 数据，如果请求失败则返回 None。
    """
    time.sleep(QUERY_INTERVAL)
    url = f"https://backend.wplace.live/s0/pixel/{region_id}/{layer_id}?x={x}&y={y}"
    try:
        response = requests.get(url, headers=HEADERS, proxies=PROXIES, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"请求失败 ({x},{y}): {e}")
        return None

def search_block(region_id: int, layer_id: int, x_start: int, x_end: int, 
                y_start: int, y_end: int, result_queue: queue.Queue, progress: Dict) -> None:
    """
    搜索指定坐标块，将结果放入队列，更新进度。
    """
    for x in range(x_start, x_end):
        for y in range(y_start, y_end):
            progress_key = f"{x},{y}"
            if progress_key in progress:
                continue
            data = fetch_pixel_data(region_id, layer_id, x, y)
            if data and "paintedBy" in data and "id" in data["paintedBy"]:
                result_queue.put((x, y, data["paintedBy"]["id"]))
            progress[progress_key] = True

def save_progress(progress: Dict) -> None:
    """保存搜索进度到文件"""
    try:
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False)
    except Exception as e:
        logger.error(f"保存进度失败: {e}")

def load_progress() -> Dict:
    """加载搜索进度"""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"加载进度失败: {e}")
    return {}

def save_results(results: List[Tuple[int, int, int]]) -> None:
    """保存搜索结果到文件"""
    try:
        with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"保存结果失败: {e}")

def load_results() -> List[Tuple[int, int, int]]:
    """加载已有搜索结果"""
    try:
        if os.path.exists(RESULTS_FILE):
            with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"加载结果失败: {e}")
    return []

def search_coordinates(region_id: int, layer_id: int, x1: int, y1: int, x2: int, y2: int, 
                     block_size: int = 100, max_workers: int = 10) -> List[Tuple[int, int, int]]:
    """
    使用多线程搜索指定坐标范围内的 ID。
    """
    found_coordinates = load_results()
    progress = load_progress()
    result_queue = queue.Queue()
    
    x_start, x_end = min(x1, x2), max(x1, x2) + 1
    y_start, y_end = min(y1, y2), max(y1, y2) + 1
    x_start, x_end = max(0, x_start), min(x_end, 4000)
    y_start, y_end = max(0, y_start), min(y_end, 4000)
    
    total_blocks = ((x_end - x_start + block_size - 1) // block_size) * ((y_end - y_start + block_size - 1) // block_size)
    current_block = 0

    logger.info(f"将范围分为 {total_blocks} 个 {block_size}x{block_size} 的块，使用 {max_workers} 个线程搜索...")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for x_block_start in range(x_start, x_end, block_size):
            for y_block_start in range(y_start, y_end, block_size):
                x_block_end = min(x_block_start + block_size, x_end)
                y_block_end = min(y_block_start + block_size, y_end)
                current_block += 1
                logger.info(f"处理块 {current_block}/{total_blocks} (x={x_block_start}-{x_block_end-1}, y={y_block_start}-{y_block_end-1})")
                futures.append(
                    executor.submit(
                        search_block, region_id, layer_id, x_block_start, x_block_end, 
                        y_block_start, y_block_end, result_queue, progress
                    )
                )

        for future in futures:
            try:
                future.result()
            except Exception as e:
                logger.error(f"线程执行失败: {e}")

    while not result_queue.empty():
        found_coordinates.append(result_queue.get())

    save_results(found_coordinates)
    save_progress(progress)
    return found_coordinates

def main() -> None:
    """主函数，处理用户输入并执行搜索"""
    print("=== 像素坐标查找工具（按坐标范围） ===")
    
    while True:
        try:
            region_id = int(input("请输入地区编号（例如 1700）："))
            if region_id <= 0:
                print("请输入一个正整数。")
                continue
            break
        except ValueError:
            print("输入无效，请输入一个数字地区编号。")

    while True:
        try:
            layer_id = int(input("请输入图层编号（例如 830）："))
            if layer_id <= 0:
                print("请输入一个正整数。")
                continue
            break
        except ValueError:
            print("输入无效，请输入一个数字图层编号。")

    while True:
        try:
            x1 = int(input("请输入第一个坐标 x1（0-3999）："))
            y1 = int(input("请输入第一个坐标 y1（0-3999）："))
            x2 = int(input("请输入第二个坐标 x2（0-3999）："))
            y2 = int(input("请输入第二个坐标 y2（0-3999）："))
            if not (0 <= x1 <= 3999 and 0 <= y1 <= 3999 and 0 <= x2 <= 3999 and 0 <= y2 <= 3999):
                print("坐标必须在 0-3999 范围内。")
                continue
            break
        except ValueError:
            print("输入无效，请输入数字坐标。")

    print(f"\n正在搜索地区 {region_id}，图层 {layer_id}，范围 ({x1},{y1}) 到 ({x2},{y2})...")
    start_time = time.time()
    found_coordinates = search_coordinates(region_id, layer_id, x1, y1, x2, y2)

    print("\n=== 搜索结果 ===")
    if found_coordinates:
        print("在以下坐标找到 ID：")
        for x, y, id_ in found_coordinates:
            print(f"x={x}, y={y}, ID={id_}")
    else:
        print("在指定范围内未找到任何 ID。")

    print(f"\n搜索耗时：{time.time() - start_time:.2f} 秒")

    while True:
        again = input("\n是否要再次搜索？（是/否）：").strip().lower()
        if again in ['是', 'y']:
            print("\n")
            main()
            break
        elif again in ['否', 'n']:
            print("退出程序，再见！")
            break
        else:
            print("请输入‘是’或‘否’。")

if __name__ == "__main__":
    main()