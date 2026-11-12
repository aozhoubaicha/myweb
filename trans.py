import json
import os
import sys
import argparse
import time
import tkinter as tk
from tkinter import simpledialog, filedialog, messagebox
from openai import OpenAI

def collect_strings(obj, path=[]):
    items = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            items.extend(collect_strings(value, path + [key]))
    elif isinstance(obj, list):
        for idx, value in enumerate(obj):
            items.extend(collect_strings(value, path + [idx]))
    elif isinstance(obj, str):
        items.append((path, obj))
    return items

def set_by_path(obj, path, value):
    for key in path[:-1]:
        obj = obj[key]
    obj[path[-1]] = value

def batch_translate(texts, target_lang, client, model="deepseek-chat"):
    """
    使用 JSON 数组方式批量翻译，彻底避免分隔符问题。
    输入：字符串列表
    输出：翻译后的字符串列表（与输入顺序一致）
    """
    # 构造 JSON 数组作为用户消息
    input_json = json.dumps(texts, ensure_ascii=False)
    system_msg = (
        f"你是一个专业翻译助手。我会给你一个 JSON 字符串数组，请将数组中的每个字符串翻译成{target_lang}。"
        f"你必须返回一个仅包含翻译结果的 JSON 字符串数组，顺序与输入完全一致。"
        f"不要添加任何额外文字、解释或 Markdown 代码块。只输出一个合法的 JSON 数组。"
    )

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": input_json}
                ],
                temperature=0.1,
                max_tokens=4096
            )
            content = response.choices[0].message.content.strip()

            # 清理可能出现的 Markdown 代码块
            if content.startswith("```"):
                # 去掉首行的 ```json 或 ```
                lines = content.split('\n')
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                content = '\n'.join(lines).strip()

            # 尝试解析为 JSON 数组
            translated_list = json.loads(content)
            if not isinstance(translated_list, list):
                raise ValueError("返回的不是 JSON 数组")
            if len(translated_list) != len(texts):
                raise ValueError(f"翻译结果数量({len(translated_list)})与原文数量({len(texts)})不匹配")

            # 确保每个元素是字符串
            return [str(item) for item in translated_list]

        except (json.JSONDecodeError, ValueError, Exception) as e:
            print(f"批次翻译失败 (尝试 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"翻译失败，已达到最大重试次数: {e}")

def translate_json(input_file, output_file, target_lang, batch_size, api_key, base_url):
    client = OpenAI(api_key=api_key, base_url=base_url)

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    all_strings = collect_strings(data)
    total = len(all_strings)
    print(f"共发现 {total} 个待翻译字符串")

    for i in range(0, total, batch_size):
        batch_paths_texts = all_strings[i:i+batch_size]
        paths, texts = zip(*batch_paths_texts)
        print(f"正在翻译第 {i+1}-{min(i+batch_size, total)} 个片段...")
        translated = batch_translate(list(texts), target_lang, client)
        for path, trans in zip(paths, translated):
            set_by_path(data, path, trans)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"翻译完成，结果已保存至 {output_file}")

def gui_mode():
    """图形界面交互模式"""
    root = tk.Tk()
    root.withdraw()

    # 1. 输入 API 密钥
    api_key = simpledialog.askstring("API 密钥", "请输入 DeepSeek API 密钥：", show='*')
    if not api_key:
        messagebox.showwarning("已取消", "未提供 API 密钥，程序退出。")
        return

    # 2. 选择输入文件
    input_file = filedialog.askopenfilename(
        title="选择要翻译的 JSON 文件",
        filetypes=[("JSON 文件", "*.json"), ("所有文件", "*.*")]
    )
    if not input_file:
        messagebox.showwarning("已取消", "未选择文件，程序退出。")
        return

    # 3. 目标语言
    target_lang = simpledialog.askstring("目标语言", "请输入目标语言：", initialvalue="中文") or "中文"

    # 4. 确定输出文件（避免直接覆盖已有文件）
    base, ext = os.path.splitext(input_file)
    default_output = f"{base}_translated{ext}"
    while True:
        # 弹出保存对话框，默认文件名是 _translated.json
        output_file = filedialog.asksaveasfilename(
            title="保存翻译后的 JSON 文件",
            initialfile=os.path.basename(default_output),
            defaultextension=".json",
            filetypes=[("JSON 文件", "*.json"), ("所有文件", "*.*")]
        )
        if not output_file:
            # 用户取消保存 → 自动生成文件名，且避免覆盖
            output_file = default_output
            counter = 1
            while os.path.exists(output_file):
                output_file = f"{base}_translated_{counter}{ext}"
                counter += 1
            break
        else:
            # 用户指定了路径，检查是否已存在
            if os.path.exists(output_file):
                overwrite = messagebox.askyesno(
                    "文件已存在",
                    f"文件 '{output_file}' 已存在。\n是否覆盖？"
                )
                if overwrite:
                    break
                # 否则重新选择
            else:
                break

    root.destroy()

    try:
        translate_json(
            input_file=input_file,
            output_file=output_file,
            target_lang=target_lang,
            batch_size=20,
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        messagebox.showinfo("完成", f"翻译成功！\n结果已保存至：\n{output_file}")
    except Exception as e:
        messagebox.showerror("翻译失败", str(e))

def main():
    if len(sys.argv) == 1:
        gui_mode()
    else:
        parser = argparse.ArgumentParser(description="使用 DeepSeek API 分段翻译 JSON 文件中的字符串值")
        parser.add_argument("--input", required=True, help="输入 JSON 文件路径")
        parser.add_argument("--output", required=True, help="输出 JSON 文件路径")
        parser.add_argument("--target-lang", default="中文", help="目标语言")
        parser.add_argument("--batch-size", type=int, default=20, help="每批翻译的字符串数量")
        parser.add_argument("--api-key", default=os.environ.get("DEEPSEEK_API_KEY"), help="API 密钥")
        parser.add_argument("--base-url", default="https://api.deepseek.com", help="API 地址")
        args = parser.parse_args()

        if not args.api_key:
            raise ValueError("请设置 DEEPSEEK_API_KEY 环境变量或通过 --api-key 参数提供")

        translate_json(
            input_file=args.input,
            output_file=args.output,
            target_lang=args.target_lang,
            batch_size=args.batch_size,
            api_key=args.api_key,
            base_url=args.base_url
        )

if __name__ == "__main__":
    main()