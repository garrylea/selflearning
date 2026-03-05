import os
import requests
from pathlib import Path

# 前置准备：
# 1. 使用 Python 3.12 
# 2. pip install requests

def test_kimi_pdf_to_md(api_key: str, pdf_path: str):
    print(f"\n==========================================")
    print(f"🚀 开始测试模型: Kimi-2.5 (Moonshot)")
    print(f"📄 测试文件: {pdf_path}")
    print(f"==========================================")
    
    # 1. 上传文件到 Moonshot 服务器
    print("正在上传 PDF 至 Moonshot 服务器...")
    upload_url = "https://api.moonshot.cn/v1/files"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    with open(pdf_path, "rb") as f:
        file_res = requests.post(
            upload_url,
            headers=headers,
            files={"file": (Path(pdf_path).name, f, "application/pdf"), "purpose": (None, "file-extract")}
        )
    
    if file_res.status_code != 200:
        print(f"❌ 上传失败: {file_res.text}")
        return
    
    file_id = file_res.json()["id"]
    print(f"✅ 上传成功。File ID: {file_id}")
    
    # 2. 调用 Chat API 进行解析
    print("⏳ 正在请求 Kimi 解析 PDF 内容...")
    chat_url = "https://api.moonshot.cn/v1/chat/completions"
    
    prompt = """
    你是一个专业的初中理科教育专家。请严格解析上传的 PDF 文件【第 1 页】内容，并将其转换为标准 Markdown。
    
    格式要求：
    1. 【数学公式】：必须使用标准 LaTeX 语法。
    2. 【图形描述】：对于题目中的任何几何图形或函数图象，你必须插入 Blockquote 进行极其详尽的文字描述。
    3. 【禁止 Unicode】：禁止使用 √、∠ 等特殊符号，统一用 LaTeX。
    """
    
    payload = {
        "model": "moonshot-v1-8k", # 注意：Kimi 2.5 通常是通过 v1 接口平滑升级的，或者指定特定版本
        "messages": [
            {
                "role": "system",
                "content": "你是 Kimi，由 Moonshot AI 提供。你擅长解析长文档和提取理科公式。"
            },
            {
                "role": "user",
                "content": f"请解析以下文件内容：$file-{file_id}\n\n{prompt}"
            }
        ],
        "temperature": 0.3
    }
    
    response = requests.post(chat_url, headers=headers, json=payload)
    
    if response.status_code == 200:
        content = response.json()["choices"][0]["message"]["content"]
        output_file = "result_kimi.md"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ 解析完成！结果已保存至 {output_file}")
        # 打印前 500 字展示效果
        print("\n--- 结果预览 ---")
        print(content[:500] + "...")
    else:
        print(f"❌ 解析失败: {response.text}")

def test_qwen_pdf_to_md(api_key: str, pdf_path: str):
    print(f"\n==========================================")
    print(f"🚀 开始测试模型: Qwen-Long (阿里千问)")
    print(f"📄 测试文件: {pdf_path}")
    print(f"==========================================")
    
    # 1. 上传文件至 DashScope
    # 注意：千问通常需要先使用其文件上传接口，这里使用简单示例逻辑
    print("正在通过 DashScope 接口解析 PDF...")
    # (此处省略具体的 DashScope SDK 调用，改为通用的 HTTP 逻辑或建议安装 SDK)
    print("⚠️ 提示：千问测试建议安装 'dashscope' 官方库以获得最佳 PDF 解析效果。")
    print("命令：/opt/miniconda3/bin/python -m pip install dashscope")

if __name__ == "__main__":
    sample_pdf = "sample_test.pdf"
    kimi_key = os.getenv("MOONSHOT_API_KEY", "YOUR_KIMI_KEY")
    qwen_key = os.getenv("DASHSCOPE_API_KEY", "YOUR_QWEN_KEY")
    
    # 根据提供的 Key 选择性运行测试
    if os.path.exists(sample_pdf):
        if kimi_key != "YOUR_KIMI_KEY":
            test_kimi_pdf_to_md(kimi_key, sample_pdf)
        
        if qwen_key != "YOUR_QWEN_KEY":
            test_qwen_pdf_to_md(qwen_key, sample_pdf)
    else:
        print(f"⚠️ 找不到测试文件：{sample_pdf}")
