# Sui Intent Agent - 简化的 Dockerfile
FROM node:20-alpine

# 安装依赖
RUN apk add --no-cache libc6-compat wget

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]
