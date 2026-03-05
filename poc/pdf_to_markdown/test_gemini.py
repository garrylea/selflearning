import os
import time
from google import genai

# 前置准备：
# 1. 使用 Python 3.12 环境
# 2. pip install google-genai

client = genai.Client()

def test_gemini_pdf_to_md(pdf_path: str, model_name: str = "gemini-2.5-flash"):
    print(f"\n==========================================")
    print(f"🚀 开始测试模型 (流式): {model_name}")
    print(f"📄 测试文件: {pdf_path}")
    print(f"==========================================")
    
    # 1. 利用 File API 上传 PDF
    print("正在上传 PDF 文件至 Google 暂存服务器...")
    uploaded_file = client.files.upload(file=pdf_path)
    print(f"✅ 上传成功。文件 URI: {uploaded_file.uri}")
    
    # 2. 强化 LaTeX 的 Prompt
    prompt = """
    你是一个专业的初中理科教育专家。请严格解析这份试卷 PDF 的【第 1 页】内容，并将其转换为标准 Markdown。
    
    格式与语法要求：
    1. 【数学公式 (最高优先级)】：禁止使用任何 Unicode 数学符号（如 √, ∠, ÷, ², π）。所有的数学表达式、几何符号、算式必须强制使用标准 LaTeX 语法。
       - 行内公式请用 $ ... $ 包裹（例如：$\\sqrt{10}$, $\\angle ABC = 90^\\circ$）。
       - 独立算式请用 $$ ... $$ 包裹。
    2. 【图形描述】：文档中出现的任何图片（几何图形、函数图象、物理受力图），你必须在对应位置插入一个 Blockquote，极其详尽地描述该图的所有已知信息、几何关系、点线面位置。
       格式：> 【图形描述】：... 
    3. 【题目结构】：保留试卷的原本序号和题目层级。
    """
    
    print(f"⏳ 正在启动流式生成...")
    start_time = time.time()
    
    try:
        output_file = f"result_{model_name.replace('.', '_')}.md"
        with open(output_file, "w", encoding="utf-8") as f:
            # 使用 generate_content_stream 开启流式传输
            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=[uploaded_file, prompt],
            )
            for chunk in response_stream:
                if chunk.text:
                    # 实时同步到终端和文件
                    print(chunk.text, end="", flush=True)
                    f.write(chunk.text)
            
        end_time = time.time()
        print(f"\n\n✅ 生成完成！耗时: {end_time - start_time:.2f} 秒")
        print(f"📁 结果已保存至 {output_file}")
        
    except Exception as e:
        print(f"\n❌ 调用过程中发生错误: {e}")
        
    finally:
        # 4. 清理云端文件
        try:
            client.files.delete(name=uploaded_file.name)
            print("🧹 云端临时测试文件已清理完毕。")
        except:
            pass

if __name__ == "__main__":
    sample_pdf = "sample_test.pdf" 
    
    if not os.path.exists(sample_pdf):
        print(f"⚠️ 找不到测试文件：{sample_pdf}")
    else:
        # 1. 测试 2.5 Flash (之前已验证)
        test_gemini_pdf_to_md(sample_pdf, "gemini-2.5-flash")
        
        # 2. 测试最新的 3.0 Flash 预览版
        test_gemini_pdf_to_md(sample_pdf, "gemini-3-flash-preview")
        
        # 3. 测试 3.1 Flash 图像专用版 (理论上对 PDF 中的图形识别最强)
        test_gemini_pdf_to_md(sample_pdf, "gemini-3.1-flash-image-preview")
