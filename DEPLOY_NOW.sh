#!/bin/bash
# Swap Wrapper 服务器部署脚本
# 服务器: 82.29.54.80
# 日期: 2026-02-10

set -e

echo "========================================="
echo "Swap Wrapper 部署脚本"
echo "========================================="
echo ""

# 1. 检查并安装 Sui CLI
echo "步骤 1: 检查 Sui CLI..."
if ! command -v sui &> /dev/null; then
    echo "Sui CLI 未安装，开始安装..."
    cd /tmp
    wget -q https://github.com/MystenLabs/sui/releases/download/mainnet-v1.37.1/sui-mainnet-v1.37.1-ubuntu-x86_64
    chmod +x sui-mainnet-v1.37.1-ubuntu-x86_64
    sudo mv sui-mainnet-v1.37.1-ubuntu-x86_64 /usr/local/bin/sui
    echo "✅ Sui CLI 安装完成"
else
    echo "✅ Sui CLI 已安装: $(sui --version)"
fi
echo ""

# 2. 检查合约代码
echo "步骤 2: 检查合约代码..."
if [ ! -d "/root/authorization-package" ]; then
    echo "❌ 错误: /root/authorization-package 目录不存在"
    echo "请先上传合约代码到服务器"
    exit 1
fi
cd /root/authorization-package
echo "✅ 合约代码目录存在"
echo ""

# 3. 编译合约
echo "步骤 3: 编译合约..."
sui move build
if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi
echo "✅ 编译成功"
echo ""

# 4. 检查钱包配置
echo "步骤 4: 检查钱包配置..."
ACTIVE_ADDRESS=$(sui client active-address 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ 钱包未配置，请先配置 Sui 钱包"
    echo "运行: sui client"
    exit 1
fi
echo "✅ 当前地址: $ACTIVE_ADDRESS"
echo ""

# 5. 检查余额
echo "步骤 5: 检查 Gas 余额..."
BALANCE=$(sui client gas --json 2>&1 | grep -o '"gasBalance":"[0-9]*"' | head -1 | grep -o '[0-9]*')
BALANCE_SUI=$(echo "scale=4; $BALANCE / 1000000000" | bc)
echo "当前余额: ${BALANCE_SUI} SUI"
if (( $(echo "$BALANCE_SUI < 0.05" | bc -l) )); then
    echo "⚠️  警告: 余额不足 0.05 SUI，可能无法完成部署"
    echo "建议充值后再继续"
    read -p "是否继续部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# 6. 执行部署
echo "步骤 6: 执行合约升级部署..."
echo "目标 Package ID: 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824"
echo ""

sui client upgrade \
  --upgrade-capability 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 \
  --gas-budget 100000000

if [ $? -ne 0 ]; then
    echo "❌ 部署失败"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 记录输出中的新 Package ID"
echo "2. 更新前端 lib/config.ts 中的 SWAP_WRAPPER_PACKAGE_ID"
echo "3. 验证部署: sui client object <package-id>"
echo ""
