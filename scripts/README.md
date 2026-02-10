# Swap Wrapper 测试脚本

## 快速开始

### 1. 安装依赖

```bash
# 安装 tsx（运行 TypeScript 脚本）
pnpm add -D tsx

# 或使用 npm
npm install -D tsx
```

### 2. 设置私钥

测试脚本需要私钥来签署交易。有两种方式：

#### 方法 A：从 Sui CLI 导出（推荐）

```bash
# 导出当前活动地址的私钥
export SUI_PRIVATE_KEY=$(sui keytool export --key-identity $(sui client active-address) --json | jq -r .exportedPrivateKey)
```

#### 方法 B：手动设置

```bash
export SUI_PRIVATE_KEY="your_base64_private_key_here"
```

## 使用方法

### 📝 创建测试授权对象

```bash
pnpm tsx scripts/test-swap-wrapper.ts create-auth
```

**输出示例**：
```
🚀 Swap Wrapper 测试工具

网络: mainnet
Package ID: 0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f

🔨 创建测试授权对象...

发送者地址: 0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225
Package ID: 0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f
Agent 地址: 0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225
每日限额: 0.1 SUI
单笔限额: 0.1 SUI
过期时间: 2026-03-12

✅ 授权对象创建成功！

Transaction Digest: AbCdEf123...
Explorer: https://suiscan.xyz/mainnet/tx/AbCdEf123...

创建的对象：
  - 0x584...::swap_wrapper::Authorization: 0x1234abcd...
```

**重要**：复制授权对象 ID（如 `0x1234abcd...`），后续命令会用到！

---

### 🔄 执行授权 Swap

```bash
pnpm tsx scripts/test-swap-wrapper.ts execute-swap <AUTH_OBJECT_ID>
```

**示例**：
```bash
pnpm tsx scripts/test-swap-wrapper.ts execute-swap 0x1234abcd567890ef
```

---

### 🔒 禁用授权

```bash
pnpm tsx scripts/test-swap-wrapper.ts disable-auth <AUTH_OBJECT_ID>
```

禁用后，该授权对象将无法用于执行 Swap。

---

### 🔓 启用授权

```bash
pnpm tsx scripts/test-swap-wrapper.ts enable-auth <AUTH_OBJECT_ID>
```

重新启用之前禁用的授权对象。

---

### 🧪 运行完整测试流程

```bash
pnpm tsx scripts/test-swap-wrapper.ts test-all
```

这将创建一个测试授权对象，并提示您如何继续后续测试。

---

## 配置说明

测试脚本使用以下默认配置（在 `test-swap-wrapper.ts` 中）：

```typescript
const PACKAGE_ID = '0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f';
const MODULE_NAME = 'swap_wrapper';
const NETWORK = 'mainnet';

const TEST_PARAMS = {
  agentAddress: '0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225',
  dailyLimit: 100_000_000n, // 0.1 SUI
  perTxLimit: 100_000_000n,  // 0.1 SUI
  expiryTimestamp: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
};
```

如需修改，直接编辑 `test-swap-wrapper.ts` 文件。

---

## 故障排查

### ❌ 错误: 未找到私钥

**原因**：环境变量 `SUI_PRIVATE_KEY` 未设置。

**解决**：按照上面"设置私钥"章节操作。

---

### ❌ 没有可用的 SUI Coin

**原因**：钱包余额不足或没有 Gas Coin。

**解决**：
```bash
# 检查余额
sui client gas

# 如果余额不足，请充值
```

---

### ❌ 创建授权对象失败

**可能原因**：
1. Package ID 错误
2. Gas 不足
3. 参数格式错误

**解决**：检查错误信息，验证配置是否正确。

---

## 完整测试示例

```bash
# 1. 安装依赖
pnpm add -D tsx

# 2. 设置私钥
export SUI_PRIVATE_KEY=$(sui keytool export --key-identity $(sui client active-address) --json | jq -r .exportedPrivateKey)

# 3. 创建授权对象
pnpm tsx scripts/test-swap-wrapper.ts create-auth

# 4. 复制输出中的授权对象 ID，例如: 0x1234abcd567890ef

# 5. 执行 Swap
pnpm tsx scripts/test-swap-wrapper.ts execute-swap 0x1234abcd567890ef

# 6. 禁用授权
pnpm tsx scripts/test-swap-wrapper.ts disable-auth 0x1234abcd567890ef

# 7. 重新启用授权
pnpm tsx scripts/test-swap-wrapper.ts enable-auth 0x1234abcd567890ef
```

---

## 部署信息

| 项目 | 值 |
|------|-----|
| **Package ID** | `0x584aeac7ed367b595b453547ab6caa0c2b0dd8f580b88227585c914b26324f3f` |
| **Transaction** | `DvYDARMDH5vo8qc2YSfCANRadd7R4vsBm4Mthu2UHnN2` |
| **网络** | Sui Mainnet |
| **模块** | `authorization`, `swap_wrapper` |

详细部署信息见项目根目录的 `DEPLOYMENT_SUCCESS.md`。

---

## 注意事项

- ⚠️ 测试在主网（Mainnet）上运行，会消耗真实 Gas
- ⚠️ 请确保钱包有足够余额（至少 0.05 SUI）
- ⚠️ 授权对象创建后无法删除，只能禁用
- ⚠️ 私钥敏感信息，不要泄露或提交到代码仓库

---

## 相关文档

- [DEPLOYMENT_SUCCESS.md](../DEPLOYMENT_SUCCESS.md) - 部署详细信息
- [Sui Documentation](https://docs.sui.io/) - Sui 官方文档
- [Suiscan Explorer](https://suiscan.xyz/mainnet) - 区块链浏览器
