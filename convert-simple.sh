#!/bin/bash
# 简化版：使用 Chrome headless 截图

HTML_FILE="ARCHITECTURE.html"
PNG_FILE="ARCHITECTURE.png"

echo "🦦 Otter 架构图转换工具（简化版）"
echo "=================================="

# 检查 Chrome 是否存在
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -f "$CHROME" ]; then
    echo "❌ 未找到 Chrome 浏览器"
    exit 1
fi

# 获取 HTML 文件的绝对路径
HTML_PATH="$(pwd)/$HTML_FILE"

echo "📸 使用 Chrome headless 截图..."
"$CHROME" --headless --disable-gpu --screenshot="$PNG_FILE" --window-size=1400,30000 "file://$HTML_PATH" 2>/dev/null

if [ -f "$PNG_FILE" ]; then
    echo "✅ PNG 已生成: $PNG_FILE"
    echo "🖼️  文件大小: $(du -h "$PNG_FILE" | cut -f1)"

    # 自动打开
    open "$HTML_FILE"
    open "$PNG_FILE"

    echo ""
    echo "✨ 转换完成！"
else
    echo "❌ 截图失败"
    exit 1
fi
