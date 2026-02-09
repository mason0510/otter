#!/bin/bash

# Sui Intent Agent - 部署到美国服务器（使用 systemd）
# 目标服务器: 82.29.54.80

set -e

SERVER="root@82.29.54.80"
PORT=3000

echo "🚀 开始部署到美国服务器 (systemd)..."

# 1. 本地打包
echo "📦 打包项目..."
tar -czf /tmp/sui-intent-agent.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=*.log \
  .

# 2. 上传到服务器
echo "📤 上传到服务器..."
scp /tmp/sui-intent-agent.tar.gz $SERVER:/tmp/
scp sui-intent-agent.service $SERVER:/tmp/

# 3. 在服务器上部署
echo "🔧 在服务器上部署..."
ssh $SERVER << 'ENDSSH'
set -e

# 创建应用目录
mkdir -p /var/www/sui-intent-agent

# 解压
cd /var/www
rm -rf sui-intent-agent.old
mv sui-intent-agent sui-intent-agent.old 2>/dev/null || true
mkdir -p sui-intent-agent
cd sui-intent-agent
tar -xzf /tmp/sui-intent-agent.tar.gz

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  请编辑 .env 文件，填入 DEEPSEEK_API_KEY"
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🏗️  构建项目..."
npm run build

# 安装 systemd service
echo "🔧 安装 systemd service..."
mv /tmp/sui-intent-agent.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable sui-intent-agent
systemctl restart sui-intent-agent

# 检查状态
sleep 3
systemctl status sui-intent-agent --no-pager

# 清理
rm /tmp/sui-intent-agent.tar.gz

echo "✅ 部署完成！"
ENDSSH

echo "🎉 部署成功！"
echo "📍 访问地址: http://82.29.54.80:$PORT"
echo "📊 查看日志: ssh $SERVER 'journalctl -u sui-intent-agent -f'"
echo "🔄 重启服务: ssh $SERVER 'systemctl restart sui-intent-agent'"

# 清理本地临时文件
rm /tmp/sui-intent-agent.tar.gz
