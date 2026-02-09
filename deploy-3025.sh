#!/bin/bash

# Sui Intent Agent - 部署到生产服务器 (3025端口)
# 目标服务器: 82.29.54.80:3025

set -e

SERVER="root@82.29.54.80"
PORT=3025
CONTAINER_NAME="sui-intent-agent"
IMAGE_NAME="sui-intent-agent"
APP_DIR="/var/www/sui-intent-agent"

echo "🚀 开始部署到生产服务器 (端口 $PORT)..."

# 1. 本地打包
echo "📦 打包项目..."
tar -czf /tmp/sui-intent-agent.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=*.log \
  --exclude=.env \
  .

# 2. 上传到服务器
echo "📤 上传到服务器..."
scp /tmp/sui-intent-agent.tar.gz $SERVER:/tmp/

# 3. 在服务器上部署
echo "🔧 在服务器上部署..."
ssh $SERVER << 'ENDSSH'
set -e

CONTAINER_NAME="sui-intent-agent"
IMAGE_NAME="sui-intent-agent"
PORT=3025
APP_DIR="/var/www/sui-intent-agent"

# 创建应用目录
mkdir -p $APP_DIR
cd $APP_DIR

# 备份旧版本
rm -rf old
mv * old/ 2>/dev/null || true

# 解压新版本
tar -xzf /tmp/sui-intent-agent.tar.gz

# 确保 .env 文件存在
if [ ! -f .env ]; then
  echo "⚠️  .env 文件不存在，创建默认配置..."
  cat > .env << 'EOF'
# Sui Mainnet RPC
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io

# DeepSeek API (需要手动设置)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=Otter - Sui Intent Composer
NEXT_PUBLIC_NETWORK=mainnet
EOF
fi

# 停止并删除旧容器
echo "🛑 停止旧容器..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 删除旧镜像
echo "🗑️  删除旧镜像..."
docker rmi $IMAGE_NAME 2>/dev/null || true

# 构建新镜像
echo "🏗️  构建新镜像..."
docker buildx build --no-cache -t $IMAGE_NAME .

# 启动新容器
echo "🚀 启动新容器 (端口 $PORT)..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p $PORT:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  $IMAGE_NAME

# 等待容器启动
echo "⏳ 等待容器启动..."
sleep 5

# 查看容器状态
echo "✅ 容器状态："
docker ps | grep $CONTAINER_NAME

# 查看日志
echo "📊 查看启动日志..."
docker logs --tail=30 $CONTAINER_NAME

# 清理临时文件
rm /tmp/sui-intent-agent.tar.gz

echo "✅ 部署完成！"
ENDSSH

echo "🎉 部署成功！"
echo "📍 访问地址: http://82.29.54.80:$PORT"
echo "📊 查看日志: ssh $SERVER 'docker logs -f $CONTAINER_NAME'"
echo "🔄 重启服务: ssh $SERVER 'docker restart $CONTAINER_NAME'"
echo "🔧 进入容器: ssh $SERVER 'docker exec -it $CONTAINER_NAME sh'"

# 清理本地临时文件
rm /tmp/sui-intent-agent.tar.gz
