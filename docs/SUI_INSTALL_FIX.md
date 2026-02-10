# Sui CLI 安装故障排除

## 问题分析

之前的安装命令失败，因为 Sui 仓库的包结构已更改。

## 正确的安装方法

### 方法 1: 使用预编译二进制文件（推荐）

这是最快最可靠的方法：

```bash
# 登录服务器
ssh root@82.29.54.80

# 下载最新版本的 Sui CLI
wget https://github.com/MystenLabs/sui/releases/download/mainnet-v1.37.1/sui-mainnet-v1.37.1-ubuntu-x86_64

# 移动到 PATH
chmod +x sui-mainnet-v1.37.1-ubuntu-x86_64
sudo mv sui-mainnet-v1.37.1-ubuntu-x86_64 /usr/local/bin/sui

# 验证安装
sui --version
```

### 方法 2: 从源码编译

如果预编译版本不可用，从源码编译：

```bash
# 登录服务器
ssh root@82.29.54.80

# 克隆 Sui 仓库
cd /tmp
git clone https://github.com/MystenLabs/sui.git
cd sui

# 切换到 mainnet 分支
git checkout mainnet

# 从工作目录安装
cargo install --path crates/sui/cli

# 添加到 PATH（如果需要）
export PATH="$HOME/.cargo/bin:$PATH"
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc

# 验证安装
sui --version
```

### 方法 3: 使用特定的 release tag

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --tag mainnet-v1.37.1 sui
```

## 推荐的快速安装步骤

```bash
# 1. 登录服务器
ssh root@82.29.54.80

# 2. 创建临时目录
mkdir -p /tmp/sui-install
cd /tmp/sui-install

# 3. 下载预编译版本（最快的选项）
wget https://github.com/MystenLabs/sui/releases/download/mainnet-v1.37.1/sui-mainnet-v1.37.1-ubuntu-x86_64

# 4. 安装
chmod +x sui-mainnet-v1.37.1-ubuntu-x86_64
sudo mv sui-mainnet-v1.37.1-ubuntu-x86_64 /usr/local/bin/sui

# 5. 验证
sui --version

# 应该输出: sui 1.37.1
```

## 如果以上方法都不行

### 使用 Docker

```bash
# 拉取 Sui Docker 镜像
docker pull mysten/sui-tools:mainnet-v1.37.1

# 运行 Sui CLI
docker run -it --rm \
  -v ~/.sui:/root/.sui \
  mysten/sui-tools:mainnet-v1.37.1 \
  sui --version

# 部署时使用 docker
docker run -it --rm \
  -v ~/.sui:/root/.sui \
  -v /root:/root \
  mysten/sui-tools:mainnet-v1.37.1 \
  sui client upgrade -c 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 --gas-budget 100000000
```

## 验证安装成功

```bash
# 检查版本
sui --version

# 检查帮助
sui --help

# 检查客户端
sui client --help
```

## 完整的部署流程（使用预编译版本）

```bash
# 1. 登录服务器
ssh root@82.29.54.80

# 2. 安装 Sui CLI
cd /tmp
wget https://github.com/MystenLabs/sui/releases/download/mainnet-v1.37.1/sui-mainnet-v1.37.1-ubuntu-x86_64
chmod +x sui-mainnet-v1.37.1-ubuntu-x86_64
sudo mv sui-mainnet-v1.37.1-ubuntu-x86_64 /usr/local/bin/sui

# 3. 验证
sui --version

# 4. 配置钱包（如果还没有）
sui client

# 5. 检查 gas
sui client gas

# 6. 如果余额不足，充值或使用其他钱包

# 7. 编译合约
cd /root
sui move build

# 8. 部署
sui client upgrade \
  -c 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 \
  --gas-budget 100000000

# 9. 验证
sui client object 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

## 常见版本

- **mainnet-v1.37.1** (最新稳定版)
- **mainnet-v1.36.0**
- **mainnet-v1.35.0**

可以从 https://github.com/MystenLabs/sui/releases 查看所有可用版本。

---
**更新时间**: 2026-02-10
**推荐方法**: 使用预编译二进制文件
