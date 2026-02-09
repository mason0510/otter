#!/bin/bash

# Sui Intent Agent - 部署到美国服务器
# 目标服务器: 82.29.54.80

set -e

SERVER="root@82.29.54.80"
APP_DIR="/var/www/sui-intent-agent"
APP_NAME="sui-intent-agent"
PORT=3000

echo "🚀 开始部署到美国服务器..."

# 1. 本地打包（排除 node_modules 和 .next）
echo "📦 打包项目..."
tar -czf /tmp/$APP_NAME.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=*.log \
  .

# 2. 上传到服务器
echo "📤 上传到服务器..."
scp /tmp/$APP_NAME.tar.gz $SERVER:/tmp/

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

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🏗️  构建项目..."
npm run build

# 停止旧进程
pkill -f "next start" || true
sleep 2

# 启动新进程
echo "🚀 启动服务..."
nohup npm start > /var/log/sui-intent-agent.log 2>&1 &

# 清理
rm /tmp/sui-intent-agent.tar.gz

echo "✅ 部署完成！"
ENDSSH

echo "🎉 部署成功！"
echo "📍 访问地址: http://82.29.54.80:$PORT"
echo "📊 查看日志: ssh $SERVER 'tail -f /var/log/sui-intent-agent.log'"

# 清理本地临时文件
rm /tmp/$APP_NAME.tar.gz
