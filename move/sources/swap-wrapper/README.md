# Swap Wrapper - 授权模式 Swap 合约

## 概述

Swap Wrapper 是一个封装 DEX Swap 操作的 Move 合约，允许用户使用授权模式执行 Swap，无需每次签名。

## 功能特性

- ✅ 支持使用授权对象（Authorization）执行 Swap
- ✅ 自动检查授权限额（每日限额、单笔限额）
- ✅ 自动更新授权使用量
- ✅ 滑点保护
- ✅ 完整的事件日志

## 当前状态

**⚠️ 合约已开发，但尚未部署到主网**

- 源代码：`move/sources/swap-wrapper/sources/swap_wrapper.move`
- 当前 Package ID（占位）：`0x0`

## 部署步骤

### 1. 编译合约

```bash
cd move/sources/swap-wrapper
sui move build
```

### 2. 部署到 Sui 主网

```bash
sui client publish --gas-budget 100000000
```

部署后，复制输出的 Package ID。

### 3. 更新前端配置

在 `.env.local` 或 `.env` 中设置：

```bash
NEXT_PUBLIC_SWAP_WRAPPER_PACKAGE_ID=<部署后的 Package ID>
```

或者在 `lib/config.ts` 中更新默认值：

```typescript
export const SWAP_WRAPPER_PACKAGE_ID = '0x<你的 Package ID>';
```

### 4. 重启开发服务器

```bash
npm run dev
```

## 使用流程

```
┌─────────────────────────────────────────────────────────────┐
│ 用户操作流程                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 用户访问 /authorize 创建授权对象                          │
│     ├── 设置每日限额（如 0.1 SUI）                           │
│     ├── 设置单笔限额（如 0.1 SUI）                           │
│     └── 设置有效期（如 30 天）                                │
│                                                             │
│  2. 前端保存授权对象 ID 到 localStorage                       │
│                                                             │
│  3. 用户执行 Swap 操作                                       │
│     ├── 前端检测到授权对象 + Swap Wrapper 已部署              │
│     ├── 调用 buildAuthorizedSwap() 构建交易                   │
│     └── 用户签名一次，后续 Swap 无需重复签名                  │
│                                                             │
│  4. Swap Wrapper 合约执行                                    │
│     ├── 检查授权状态（enabled, 未过期）                        │
│     ├── 检查限额（单笔、每日）                                │
│     ├── 执行 Swap（调用 Cetus DEX）                          │
│     └── 更新授权使用量                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 合约接口

### create_test_authorization

创建测试用的授权对象（仅用于测试，生产环境应使用 authorization 模块的授权对象）

```move
public entry fun create_test_authorization(
    agent: address,
    token_type: String,
    daily_limit: u64,
    per_tx_limit: u64,
    validity_days: u64,
    ctx: &mut TxContext
)
```

### execute_swap_with_auth

使用授权执行 Swap

```move
public entry fun execute_swap_with_auth(
    auth: &mut Authorization,
    input_coin: Coin<SUI>,
    min_output: u64,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**参数说明：**
- `auth`: 授权对象（Shared Object）
- `input_coin`: 输入代币（当前仅支持 SUI）
- `min_output`: 最小输出量（滑点保护）
- `clock`: Sui 系统时钟对象

### can_execute

检查授权是否可执行（只读函数）

```move
public fun can_execute(
    auth: &Authorization,
    amount: u64,
    clock: &Clock
): bool
```

### disable_authorization / enable_authorization

禁用/重新启用授权

```move
public entry fun disable_authorization(auth: &mut Authorization, ctx: &mut TxContext)
public entry fun enable_authorization(auth: &mut Authorization, ctx: &mut TxContext)
```

### revoke_authorization

撤销授权

```move
public entry fun revoke_authorization(auth: Authorization, ctx: &mut TxContext)
```

## 前端集成

### transaction-builder.ts

```typescript
export function buildAuthorizedSwap(
  tx: Transaction,
  authObjectId: string,
  inputToken: string,
  outputToken: string,
  amount: bigint,
  minOutput: bigint,
  swapWrapperPackageId: string
)
```

### app/page.tsx

```typescript
// 检查 Swap Wrapper 是否已部署
if (SWAP_WRAPPER_PACKAGE_ID && SWAP_WRAPPER_PACKAGE_ID !== '0x0') {
  shouldUseSwapAuth = true;
  console.log('[Auth Mode] ✅ Swap 支持授权模式（Swap Wrapper 已部署）');
}

// 构建交易时传入 Swap Wrapper Package ID
const transaction = await buildTransaction(
  intents,
  address,
  authObjectId,
  AUTH_PACKAGE_ID,
  SWAP_WRAPPER_PACKAGE_ID
);
```

## 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│ 前端 (Next.js)                                               │
│ ├── app/page.tsx           - 主页面，交易执行               │
│ ├── app/authorize/page.tsx - 授权管理页面                    │
│ ├── lib/transaction-builder.ts - 交易构建逻辑                │
│ └── lib/config.ts          - 配置（Package ID 等）           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Move 合约（Sui Mainnet）                                     │
│ ├── authorization::auth    - 授权管理（已部署）              │
│ │   ├── create_authorization    - 创建授权                   │
│ │   └── execute_with_auth       - 授权转账                   │
│ │                                                              │
│ └── swap_wrapper::swap_wrapper - Swap Wrapper（待部署）      │
│     └── execute_swap_with_auth  - 授权 Swap                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ DEX（Cetus CLMM）                                            │
│ └── Swap Router                                              │
└──────────────────────────────────────────────────────────────┘
```

## 限制和注意事项

### 当前限制

1. **仅支持 SUI 作为输入代币**
   - 当前版本只支持 SUI → USDC/USDT
   - 未来版本可扩展支持更多代币

2. **Swap Wrapper 合约尚未部署**
   - 当前无法使用授权模式进行 Swap
   - 需要先部署合约并配置 Package ID

3. **价格计算**
   - 当前版本未集成 Cetus SDK 的价格查询
   - 需要前端计算最小输出量后传入

### 安全建议

1. **首次使用小额测试**
   - 建议首次设置较小的授权限额（如 0.01 SUI）
   - 测试成功后再增加限额

2. **定期检查授权状态**
   - 查看 `/authorize` 页面了解当前授权状态
   - 及时撤销不再使用的授权

3. **保护私钥**
   - 授权对象本身不涉及私钥，但需保护钱包私钥
   - 不要在公共场所连接钱包

## 后续改进计划

1. ✅ 支持更多输入代币（USDC、USDT）
2. ✅ 集成 Cetus SDK 价格查询到 Move 合约
3. ✅ 支持多跳 Swap（如 SUI → USDC → USDT）
4. ✅ 添加 Swap 历史记录查询
5. ✅ 优化 Gas 消耗

## 相关文件

- **合约源码**: `move/sources/swap-wrapper/sources/swap_wrapper.move`
- **前端集成**: `lib/transaction-builder.ts`, `app/page.tsx`
- **配置**: `lib/config.ts`
- **授权合约**: `move/sources/authorization/sources/authorization.move`

## 许可证

MIT License
