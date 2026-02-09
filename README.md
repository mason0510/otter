# Sui Intent Agent - Verified PTB Composer

> 🚀 **Sui Vibe 黑客松项目** | AI + Infra 赛道

## 项目简介

**核心创新**：自然语言 → 受限域意图 → Policy 校验 → 可验证的 PTB（Programmable Transaction Blocks）

### 解决的问题

用户在使用 DeFi 时面临的痛点：
- ❌ 需要多次签名（swap → stake → transfer）
- ❌ 不理解交易内容（怕签错）
- ❌ 操作复杂（需要理解 DEX、滑点、路由等）

### 我们的解决方案

✅ **一句话完成多步操作**
- 用户输入："把 10 SUI 换成 USDT，然后转 50% 给 Alice"
- 系统输出：交易摘要 + 风险提示 + 一键签名

✅ **可验证 + 安全**
- Token allowlist（白名单）
- 参数边界检查
- 人类可读的交易摘要

✅ **原子性**
- 所有操作在一个 PTB 中完成
- 要么全部成功，要么全部失败

---

## 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面（React）                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ 自然语言输入  │  │ 交易摘要展示   │  │ Sui Wallet 连接 │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  后端 API（Next.js API Routes）               │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ LLM 参数抽取  │  │ Policy 校验   │  │ PTB 组装器      │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Sui 区块链 (@mysten/dapp-kit)              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ PTB 构建     │  │ 仿真执行      │  │ 签名 + 上链     │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 支持的 Actions（MVP）

### 1. Swap（代币兑换）
```typescript
// 用户输入示例
"把 10 SUI 换成 USDT，滑点 3%"

// LLM 输出
{
  action: "swap",
  params: {
    inputToken: "SUI",
    outputToken: "USDT",
    amount: "10",
    slippage: "0.03"
  }
}
```

### 2. Split（余额拆分）
```typescript
// 用户输入示例
"把我的 SUI 平均分成 3 份"

// LLM 输出
{
  action: "split",
  params: {
    token: "SUI",
    splits: ["33.33%", "33.33%", "33.34%"]
  }
}
```

### 3. Transfer（转账）
```typescript
// 用户输入示例
"转 5 SUI 给 0x123..."

// LLM 输出
{
  action: "transfer",
  params: {
    token: "SUI",
    amount: "5",
    recipient: "0x123..."
  }
}
```

### 组合示例
```typescript
// 用户输入
"把 10 SUI 换成 USDT，然后转一半给 Alice"

// 生成 PTB
[
  Swap(10 SUI → USDT),
  Transfer(50% USDT → Alice_address)
]
// 一次签名完成两个操作！
```

---

## 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **钱包**: @mysten/dapp-kit (Sui Wallet)
- **状态管理**: Zustand

### 后端
- **API**: Next.js API Routes
- **LLM**: DeepSeek / GPT-4 (structured output)
- **验证**: Zod (schema validation)

### 链上
- **SDK**: @mysten/dapp-kit + @mysten/sui.js
- **网络**: Sui Testnet
- **协议**: 调用现有 DEX 协议（不自己写合约）

---

## 安全机制

### Policy 校验层
```typescript
// 白名单
const ALLOWLIST = {
  tokens: ["SUI", "USDT", "USDC"],
  contracts: ["0x...// DEX protocol"],
};

// 参数边界
const LIMITS = {
  maxAmount: 1000,      // 最大交易金额
  maxSlippage: 0.05,    // 最大滑点 5%
  maxGas: 0.1,          // 最大 gas
};

// 交易前检查
function validateTx(intent) {
  // 1. Token 在白名单
  // 2. 金额在范围内
  // 3. 滑点不超过阈值
  // 4. 目标地址格式正确
}
```

### 可解释摘要
```typescript
// 生成人类可读的摘要
function generateSummary(ptb) {
  return `
  📋 交易摘要

  操作 1: Swap
  - 输入: 10 SUI
  - 输出: ~98.5 USDT (预计)
  - 滑点: 3%

  操作 2: Transfer
  - 接收方: Alice (0x123...)
  - 金额: 49.25 USDT (50%)

  ⚠️ 风险提示:
  - 价格波动可能影响实际输出
  - 转账后不可撤销

  ✅ 签名后，以上操作将原子执行
  `;
}
```

---

## 3天开发计划

### Day 1：PTB 动作层（不依赖 LLM）

**上午（4小时）**
- ✅ 初始化 Next.js 项目
- ✅ 集成 @mysten/dapp-kit
- ✅ 配置 Sui Wallet 连接
- ✅ 测试网账号 + 测试币

**下午（4小时）**
- ✅ 实现 `buildSwapPTB(params)`
- ✅ 实现 `buildSplitPTB(params)`
- ✅ 实现 `buildTransferPTB(params)`
- ✅ 测试网跑通单个 action

**交付物**
- 3 个独立的 PTB 构建函数
- 测试网成功执行交易

---

### Day 2：LLM 参数抽取 + Policy 校验

**上午（4小时）**
- ✅ 实现 `/api/intent` API
- ✅ 集成 DeepSeek API
- ✅ Prompt engineering（输出 JSON）
- ✅ 测试 LLM 参数抽取

**下午（4小时）**
- ✅ 实现 Policy 校验层
- ✅ 实现 `generateSummary(ptb)`
- ✅ 组合多个 actions 到一个 PTB
- ✅ 测试完整流程

**交付物**
- LLM 能正确解析意图
- Policy 校验通过
- 生成可读摘要

---

### Day 3：前端 + Demo

**上午（4小时）**
- ✅ UI：自然语言输入框
- ✅ UI：交易摘要卡片（左右布局）
- ✅ UI：一键签名按钮
- ✅ UI：Loading + Success 状态

**下午（4小时）**
- ✅ 完整测试所有功能
- ✅ 录制 3 分钟 Demo 视频
- ✅ 编写 README.md
- ✅ 提交到 DeepSurge

**交付物**
- 完整可用的 DApp
- Demo 视频
- 项目文档

---

## 项目亮点（评委视角）

### 1. 技术创新
- ✅ 充分利用 Sui PTB 特性（原子多步操作）
- ✅ LLM + Policy 校验的创新结合
- ✅ Structured output 工程化实践

### 2. 生态价值
- ✅ 降低 Sui 使用门槛
- ✅ 提升交易安全性
- ✅ 可扩展的 action 插件系统

### 3. 完成度
- ✅ 端到端可用
- ✅ 安全机制完善
- ✅ UI/UX 优秀

### 4. 演示效果
- ✅ 一句话完成复杂操作
- ✅ 一次签名多步执行
- ✅ 可解释的交易摘要

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| LLM 幻觉 | Structured output + 强校验 + 失败回退手动输入 |
| PTB 构建失败 | 模板化 + 测试网充分测试 |
| SDK 兼容性 | 锁定版本 + 隔离封装 |
| RPC 不稳定 | 多 RPC 备选 + 重试机制 |
| 时间不够 | MVP 收缩到 2-3 个 action |

---

## 未来路线图

### V2（黑客松后）
- 更多 actions（stake, mint NFT, vote）
- Plugin 系统（第三方可扩展）
- 交易历史记录
- Gas 优化建议

### V3
- 多链支持（ETH, SOL, APT）
- 社区 action 市场
- 高级模式（自定义策略）

---

## 提交清单

### 代码
- [x] GitHub 仓库
- [x] 完整的 README
- [x] 清晰的代码结构
- [x] 单元测试

### Demo
- [x] 3 分钟演示视频
- [x] 测试网部署地址
- [x] 交易记录截图

### 文档
- [x] 项目介绍
- [x] 技术架构
- [x] 使用指南
- [x] 未来规划

---

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 填入 DEEPSEEK_API_KEY 和 SUI_TESTNET_MNEMONIC

# 启动开发服务器
npm run dev

# 访问
open http://localhost:3000
```

---

## 团队

- **开发者**: [你的名字]
- **AI 顾问**: Turing + Codex
- **黑客松**: Sui Vibe 2026

---

## License

MIT
