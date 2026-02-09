#!/bin/bash

# Sui Intent Agent - Docker 简化部署（不使用 docker-compose）
# 目标服务器: 82.29.54.80:3000

set -e

SERVER="root@82.29.54.80"
PORT=3000
CONTAINER_NAME="sui-intent-agent"
IMAGE_NAME="sui-intent-agent"

echo "🐳 开始 Docker 部署（简化版）..."

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

# 停止并删除旧容器
echo "🛑 停止旧容器..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# 删除旧镜像
echo "🗑️  删除旧镜像..."
docker rmi $IMAGE_NAME 2>/dev/null || true

# 构建新镜像
echo "🏗️  构建新镜像..."
/usr/bin/docker buildx build --no-cache -t $IMAGE_NAME .

# 启动新容器
echo "🚀 启动新容器..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY \
  -e NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io \
  $IMAGE_NAME

# 查看容器状态
echo "✅ 容器状态："
docker ps | grep $CONTAINER_NAME

# 查看日志
echo "📊 查看启动日志..."
sleep 3
docker logs --tail=20 $CONTAINER_NAME

# 清理
rm /tmp/sui-intent-agent.tar.gz

echo "✅ 部署完成！"
ENDSSH

echo "🎉 Docker 部署成功！"
echo "📍 访问地址: http://82.29.54.80:$PORT"
echo "📊 查看日志: ssh $SERVER 'docker logs -f $CONTAINER_NAME'"
echo "🔄 重启服务: ssh $SERVER 'docker restart $CONTAINER_NAME'"

# 清理本地临时文件
rm /tmp/sui-intent-agent.tar.gz
