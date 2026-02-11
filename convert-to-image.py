#!/usr/bin/env python3
"""
将 ARCHITECTURE.md 转换为 HTML 并截图为 PNG
"""

import subprocess
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

# 配置
MD_FILE = "ARCHITECTURE.md"
HTML_FILE = "ARCHITECTURE.html"
PNG_FILE = "ARCHITECTURE.png"

# 自定义 CSS 样式
CUSTOM_CSS = """
<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.6;
        color: #e0e0e0;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 60px;
        max-width: 1400px;
        margin: 0 auto;
    }

    h1 {
        color: #00d4ff;
        font-size: 2.5em;
        margin: 40px 0 20px 0;
        padding-bottom: 15px;
        border-bottom: 3px solid #00d4ff;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    }

    h2 {
        color: #00ffa3;
        font-size: 2em;
        margin: 30px 0 15px 0;
        padding-left: 20px;
        border-left: 5px solid #00ffa3;
    }

    h3 {
        color: #ffd700;
        font-size: 1.5em;
        margin: 20px 0 10px 0;
    }

    pre {
        background: #0a0e27;
        border: 2px solid #00d4ff;
        border-radius: 8px;
        padding: 25px;
        margin: 20px 0;
        overflow-x: auto;
        box-shadow: 0 4px 20px rgba(0, 212, 255, 0.2);
    }

    code {
        font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #00ffa3;
        white-space: pre;
        display: block;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background: rgba(10, 14, 39, 0.8);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 212, 255, 0.2);
    }

    th {
        background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%);
        color: #0a0e27;
        padding: 15px;
        text-align: left;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    td {
        padding: 12px 15px;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        color: #e0e0e0;
    }

    tr:hover {
        background: rgba(0, 212, 255, 0.1);
    }

    p {
        margin: 15px 0;
        color: #b0b0b0;
    }

    strong {
        color: #00ffa3;
        font-weight: bold;
    }

    /* ASCII 图表特殊样式 */
    pre code {
        color: #00d4ff;
        text-shadow: 0 0 5px rgba(0, 212, 255, 0.3);
    }

    /* 表格中的特殊符号 */
    td:first-child {
        color: #00ffa3;
        font-weight: bold;
    }

    /* 滚动条样式 */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    ::-webkit-scrollbar-track {
        background: #0a0e27;
    }

    ::-webkit-scrollbar-thumb {
        background: #00d4ff;
        border-radius: 5px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #00a8cc;
    }
</style>
"""

async def md_to_html():
    """将 Markdown 转换为 HTML"""
    print(f"📄 转换 {MD_FILE} -> {HTML_FILE}...")

    # 使用 pandoc 转换（保留代码块）
    result = subprocess.run(
        [
            "pandoc",
            MD_FILE,
            "-f", "markdown",
            "-t", "html",
            "--standalone",
            "-o", HTML_FILE,
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"❌ Pandoc 转换失败: {result.stderr}")
        return False

    # 读取生成的 HTML
    with open(HTML_FILE, "r", encoding="utf-8") as f:
        html_content = f.read()

    # 插入自定义 CSS
    html_content = html_content.replace("</head>", f"{CUSTOM_CSS}</head>")

    # 写回 HTML
    with open(HTML_FILE, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ HTML 已生成: {HTML_FILE}")
    return True

async def html_to_png():
    """使用 Playwright 将 HTML 截图为 PNG"""
    print(f"📸 截图 {HTML_FILE} -> {PNG_FILE}...")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1400, "height": 1080})

        # 打开 HTML 文件
        html_path = Path(HTML_FILE).absolute()
        await page.goto(f"file://{html_path}")

        # 等待渲染完成
        await page.wait_for_timeout(1000)

        # 全页面截图
        await page.screenshot(path=PNG_FILE, full_page=True)

        await browser.close()

    print(f"✅ PNG 已生成: {PNG_FILE}")
    return True

async def main():
    print("🦦 Otter 架构图转换工具")
    print("=" * 50)

    # 步骤1: MD -> HTML
    if not await md_to_html():
        return

    # 步骤2: HTML -> PNG
    await html_to_png()

    print("\n✨ 转换完成！")
    print(f"📁 HTML: {Path(HTML_FILE).absolute()}")
    print(f"🖼️  PNG:  {Path(PNG_FILE).absolute()}")

    # 自动打开 HTML 和 PNG
    subprocess.run(["open", HTML_FILE])
    subprocess.run(["open", PNG_FILE])

if __name__ == "__main__":
    asyncio.run(main())
