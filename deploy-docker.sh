#!/bin/bash

# Sui Intent Agent - Docker 部署到美国服务器
# 目标服务器: 82.29.54.80:3000

set -e

SERVER="root@82.29.54.80"
PORT=3000

echo "🐳 开始 Docker 部署到美国服务器..."

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
scp docker-compose.yml $SERVER:/tmp/

# 3. 在服务器上部署
echo "🔧 在服务器上部署..."
ssh $SERVER << 'ENDSSH'
set -e

# 创建应用目录
mkdir -p /var/www/sui-intent-agent
cd /var/www/sui-intent-agent

# 解压
rm -rf old
mv * old/ 2>/dev/null || true
tar -xzf /tmp/sui-intent-agent.tar.gz

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  请编辑 .env 文件，填入 DEEPSEEK_API_KEY"
fi

# 移动 docker-compose.yml
mv /tmp/docker-compose.yml ./

# 停止并删除旧容器
echo "🛑 停止旧容器..."
docker-compose down 2>/dev/null || true

# 构建并启动新容器
echo "🏗️  构建并启动新容器..."
docker-compose up -d --build

# 查看日志
echo "📊 查看启动日志..."
docker-compose logs --tail=20

# 检查容器状态
echo "✅ 容器状态："
docker-compose ps

# 清理
rm /tmp/sui-intent-agent.tar.gz

echo "✅ 部署完成！"
ENDSSH

echo "🎉 Docker 部署成功！"
echo "📍 访问地址: http://82.29.54.80:$PORT"
echo "📊 查看日志: ssh $SERVER 'cd /var/www/sui-intent-agent && docker-compose logs -f'"
echo "🔄 重启服务: ssh $SERVER 'cd /var/www/sui-intent-agent && docker-compose restart'"

# 清理本地临时文件
rm /tmp/sui-intent-agent.tar.gz
