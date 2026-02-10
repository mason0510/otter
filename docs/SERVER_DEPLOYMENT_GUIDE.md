# Swap Wrapper 服务器部署指南

## 服务器信息

- **IP**: 82.29.54.80
- **用户**: root
- **系统**: Ubuntu 20.04
- **工作目录**: /root/

## 当前状态

✅ **已完成**:
- 合约代码已上传到服务器 `/root/`
- authorization package 已解压
- Move.toml 配置就绪

⏳ **待完成**:
- 安装 Sui CLI
- 配置钱包
- 升级部署合约

## 快速部署步骤

### 1. SSH 登录服务器

```bash
ssh root@82.29.54.80
```

### 2. 安装 Sui CLI（如果未安装）

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --rev framework/mainnet sui
```

**预计时间**: 10-20 分钟

### 3. 验证安装

```bash
sui --version
```

应该输出: `sui 1.x.x`

### 4. 配置 Sui 钱包

```bash
# 初始化钱包（如果还没有）
sui client

# 或导入现有密钥
sui client key-import
```

### 5. 检查 gas 余额

```bash
sui client gas
```

**需要**: 至少 0.05 SUI

**如果余额不足**:
```bash
# 查看钱包地址
sui client active-address

# 向该地址充值至少 0.05 SUI
```

### 6. 编译合约

```bash
cd /root
sui move build
```

**预期输出**: 显示 "BUILDING authorization" 和编译成功信息

### 7. 升级部署

```bash
sui client upgrade \
  -c 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 \
  --gas-budget 100000000
```

**预期结果**:
```
Transaction Digest: [交易哈希]
Upgrade Package ID: 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

### 8. 验证部署

```bash
sui client object 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

应该看到两个模块:
- `authorization::auth`
- `authorization::swap_wrapper` ✨ (新)

## 完整部署脚本

保存为 `/root/deploy-swap-wrapper.sh`:

```bash
#!/bin/bash
set -e

echo "========================================="
echo "Swap Wrapper 合约部署脚本"
echo "========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 检查 Sui CLI
echo -e "\n${YELLOW}1. 检查 Sui CLI...${NC}"
if ! command -v sui &> /dev/null; then
    echo -e "${RED}❌ Sui CLI 未安装${NC}"
    echo "正在安装..."
    cargo install --locked --git https://github.com/MystenLabs/sui.git --rev framework/mainnet sui
fi
SUI_VERSION=$(sui --version)
echo -e "${GREEN}✅ Sui CLI: ${SUI_VERSION}${NC}"

# 2. 编译
echo -e "\n${YELLOW}2. 编译合约...${NC}"
cd /root
sui move build
echo -e "${GREEN}✅ 编译成功${NC}"

# 3. 检查 gas
echo -e "\n${YELLOW}3. 检查 gas...${NC}"
GAS_BALANCE=$(sui client gas | grep "mistBalance" | awk '{print $2}')
if [ "$GAS_BALANCE" -lt 50000000 ]; then
    echo -e "${RED}❌ Gas 不足 (需要 0.05 SUI)${NC}"
    sui client active-address
    exit 1
fi
echo -e "${GREEN}✅ Gas 余额充足${NC}"

# 4. 部署
echo -e "\n${YELLOW}4. 升级部署...${NC}"
sui client upgrade \
  -c 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 \
  --gas-budget 100000000

echo -e "\n${GREEN}🎉 部署完成！${NC}"

# 5. 验证
echo -e "\n${YELLOW}5. 验证部署...${NC}"
sui client object 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

运行脚本:
```bash
chmod +x /root/deploy-swap-wrapper.sh
./deploy-swap-wrapper.sh
```

## 测试流程

部署成功后，进行以下测试:

### 1. 查看已部署模块

```bash
sui client object 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

确认看到 `authorization::swap_wrapper` 模块

### 2. 前端测试

在本地前端:

1. 打开 http://localhost:3000
2. 连接钱包
3. 创建授权对象
4. 执行 Swap 操作
5. 观察是否使用授权模式（无需重复签名）

### 3. 调用合约测试

使用 Sui CLI 测试 swap_wrapper 模块:

```bash
# 创建测试授权
sui client call \
  --package 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371 \
  --module swap_wrapper \
  --function create_test_authorization \
  --args <agent-address> SUI 100000000000 100000000000 30 \
  --gas-budget 10000000
```

## 故障排查

### 问题 1: Sui CLI 未找到

```bash
# 检查 PATH
echo $PATH | grep cargo

# 如果没有，添加到 PATH
export PATH="\$HOME/.cargo/bin:\$PATH"
echo 'export PATH="\$HOME/.cargo/bin:\$PATH"' >> ~/.bashrc
```

### 问题 2: 编译失败

```bash
# 清理缓存
rm -rf /root/.move/cache

# 重新编译
sui move build
```

### 问题 3: Gas 不足

```bash
# 查看当前地址
sui client active-address

# 从其他钱包转入 SUI
# 或从水龙头获取（仅 testnet）
```

### 问题 4: 网络问题

```bash
# 检查网络连接
ping github.com

# 使用代理（如果需要）
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
```

## 部署后配置

### 更新前端环境变量

```bash
# .env.local
NEXT_PUBLIC_SWAP_WRAPPER_PACKAGE_ID=0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

### 验证前端配置

前端应该自动检测到 Swap Wrapper 已部署并启用授权模式。

## 成功标志

✅ 部署成功的标志:
1. 合约升级交易成功
2. Package 对象包含 `swap_wrapper` 模块
3. 前端显示 "Swap 支持授权模式（Swap Wrapper 已部署）"
4. Swap 操作可以使用授权对象执行

---

**生成时间**: 2026-02-10
**服务器**: 82.29.54.80
**Package ID**: 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
