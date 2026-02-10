# 🧪 Swap Wrapper 测试指南

> **快速测试指南** - 3 步开始测试已部署的合约

---

## ⚡ 快速开始

### 1️⃣ 设置私钥

```bash
export SUI_PRIVATE_KEY=$(sui keytool export --key-identity $(sui client active-address) --json | jq -r .exportedPrivateKey)
```

### 2️⃣ 创建授权对象

```bash
pnpm tsx scripts/test-swap-wrapper.ts create-auth
```

**输出示例**：
```
✅ 授权对象创建成功！

Transaction Digest: DvYDARMDH5vo8qc2YSfCANRadd7R4vsBm4Mthu2UHnN2
Explorer: https://suiscan.xyz/mainnet/tx/DvYDARMDH5vo8qc2YSfCANRadd7R4vsBm4Mthu2UHnN2

创建的对象：
  - 0x584...::swap_wrapper::Authorization: 0x1234abcd567890ef
```

**⚠️ 复制授权对象 ID（`0x1234abcd567890ef`）**

### 3️⃣ 执行测试

```bash
# 用上一步的授权对象 ID 替换 <AUTH_OBJECT_ID>
pnpm tsx scripts/test-swap-wrapper.ts execute-swap <AUTH_OBJECT_ID>
```

---

## 📋 完整命令列表

| 命令 | 功能 |
|------|------|
| `create-auth` | 创建测试授权对象 |
| `execute-swap <ID>` | 执行授权 Swap |
| `disable-auth <ID>` | 禁用授权 |
| `enable-auth <ID>` | 启用授权 |
| `test-all` | 运行完整测试流程 |

---

## 🎯 测试场景

### 场景 1：基础授权测试

```bash
# 1. 创建授权
pnpm tsx scripts/test-swap-wrapper.ts create-auth

# 2. 复制授权对象 ID，例如: 0xabcd1234

# 3. 执行 Swap
pnpm tsx scripts/test-swap-wrapper.ts execute-swap 0xabcd1234
```

### 场景 2：启用/禁用测试

```bash
# 1. 禁用授权
pnpm tsx scripts/test-swap-wrapper.ts disable-auth 0xabcd1234

# 2. 尝试执行 Swap（应该失败）
pnpm tsx scripts/test-swap-wrapper.ts execute-swap 0xabcd1234

# 3. 重新启用
pnpm tsx scripts/test-swap-wrapper.ts enable-auth 0xabcd1234

# 4. 再次执行 Swap（应该成功）
pnpm tsx scripts/test-swap-wrapper.ts execute-swap 0xabcd1234
```

---

## 📊 测试配置

| 参数 | 值 |
|------|-----|
| **网络** | Mainnet |
| **Package ID** | `0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f` |
| **每日限额** | 0.1 SUI |
| **单笔限额** | 0.1 SUI |
| **有效期** | 30 天 |

---

## ⚠️ 注意事项

- ✅ 确保钱包有足够余额（至少 0.05 SUI）
- ✅ 测试在主网运行，会消耗真实 Gas
- ✅ 授权对象创建后无法删除，只能禁用
- ✅ 私钥敏感信息，不要泄露

---

## 🔗 相关文档

- [scripts/README.md](scripts/README.md) - 详细测试脚本说明
- [DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md) - 部署信息
- [Suiscan Explorer](https://suiscan.xyz/mainnet) - 区块链浏览器

---

## 🆘 故障排查

### ❌ 错误: 未找到私钥

```bash
# 重新设置私钥
export SUI_PRIVATE_KEY=$(sui keytool export --key-identity $(sui client active-address) --json | jq -r .exportedPrivateKey)
```

### ❌ 没有可用的 SUI Coin

```bash
# 检查余额
sui client gas

# 查看地址
sui client active-address
```

### ❌ Package 版本不匹配

```bash
# 验证 Package ID
sui client object 0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f
```

---

**🚀 现在开始测试！**
