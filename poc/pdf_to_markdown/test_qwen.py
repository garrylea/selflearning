import os
import dashscope
from dashscope import Generation
from http import HTTPStatus

# 前置准备：
# 1. 使用 Python 3.12 
# 2. /opt/miniconda3/bin/python -m pip install dashscope

def test_qwen_pdf_to_md(api_key: str, pdf_path: str):
    print(f"\n==========================================")
    print(f"🚀 开始测试模型: Qwen-Long (阿里千问)")
    print(f"📄 测试文件: {pdf_path}")
    print(f"==========================================")
    
    dashscope.api_key = api_key
    
    # 1. 上传文件到 DashScope
    print("正在上传 PDF 至阿里云百炼服务器...")
    file_info = dashscope.Files.upload(file_path=pdf_path, purpose='file_extract')
    
    if file_info.status_code != HTTPStatus.OK:
        print(f"❌ 上传失败: {file_info.message}")
        return
    
    print(f"DEBUG: file_info content: {file_info}")
    
    # 根据调试出的结构获取 ID
    try:
        file_id = file_info['output']['uploaded_files'][0]['file_id']
    except (KeyError, IndexError, TypeError):
        print("❌ 无法从返回结果中提取 File ID，请检查 DEBUG 输出。")
        return
        
    print(f"✅ 上传成功。File ID: {file_id}")
    
    # 2. 调用 Qwen-Long 解析
    print("⏳ 正在请求 Qwen-Long 解析 PDF 并转换为 Markdown...")
    
    prompt = """
    你是一个专业的初中理科教育专家。请严格解析上传的 PDF 文件【第 1 页】内容，并将其转换为标准 Markdown。
    
    格式要求：
    1. 【数学公式】：必须使用标准 LaTeX 语法。
    2. 【图形描述】：对于题目中的任何几何图形或函数图象，你必须插入 Blockquote 进行极其详尽的文字描述。
    3. 【禁止 Unicode】：禁止使用 √、∠ 等特殊符号，统一用 LaTeX。
    """
    
    messages = [
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': f'fileid://{file_id}\n{prompt}'}
    ]
    
    response = Generation.call(
        model='qwen-long',
        messages=messages,
        result_format='message',
    )
    
    if response.status_code == HTTPStatus.OK:
        content = response.output.choices[0].message.content
        output_file = "result_qwen.md"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ 解析完成！结果已保存至 {output_file}")
        print("\n--- 结果预览 ---")
        print(content[:500] + "...")
    else:
        print(f"❌ 解析失败: {response.message}")
    
    # 3. 清理云端文件
    dashscope.Files.delete(file_id=file_id)
    print("🧹 云端临时测试文件已清理完毕。")

if __name__ == "__main__":
    sample_pdf = "sample_test.pdf"
    api_key = os.getenv("DASHSCOPE_API_KEY", "YOUR_QWEN_KEY")
    
    if not os.path.exists(sample_pdf):
        print(f"⚠️ 找不到测试文件：{sample_pdf}")
    else:
        test_qwen_pdf_to_md(api_key, sample_pdf)
