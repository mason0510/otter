# Sui Intent Agent - 快速开始指南

## 📦 项目概览

这是一个为 Sui Vibe 黑客松准备的项目，使用自然语言生成可验证的 PTB（Programmable Transaction Blocks）。

**核心特性**：
- ✅ 自然语言 → 意图解析（DeepSeek API）
- ✅ Policy 校验（白名单 + 参数边界）
- ✅ PTB 组装器（Swap/Split/Transfer）
- ✅ 人类可读的交易摘要
- ✅ 一次签名完成多步操作

---

## 🚀 5分钟快速启动

### 1. 安装依赖

```bash
cd otter

# 安装 Node.js 依赖
npm install

# 或使用 pnpm
pnpm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Keys
nano .env
```

**必填项**：
```env
# DeepSeek API Key（免费获取：https://platform.deepseek.com/）
DEEPSEEK_API_KEY=sk-your-key-here

# Sui Testnet RPC（可选，默认使用公共节点）
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 获取 Sui 测试币

1. 安装 Sui Wallet（浏览器插件）
2. 切换到 Testnet
3. 领取测试币：https://faucet.testnet.sui.io/

---

## 📁 项目结构

```
otter/
├── app/
│   ├── api/
│   │   └── intent/
│   │       └── route.ts          # LLM Intent 解析 API
│   ├── page.tsx                    # 主页面
│   └── layout.tsx                  # 根布局
├── components/
│   └── ui/                         # UI 组件
│       ├── button.tsx
│       ├── input.tsx
│       └── card.tsx
├── lib/
│   ├── types.ts                    # 类型定义
│   └── ptb-builder.ts              # PTB 构建器
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 🧪 测试流程

### 步骤 1：解析意图

在输入框中输入：

```
把 10 SUI 换成 USDT，滑点 3%
```

点击"解析意图"，系统会：
1. 调用 LLM 解析意图
2. 构建 PTB
3. 生成交易摘要

### 步骤 2：查看摘要

右侧会显示：
- 操作列表（Swap）
- 参数详情（输入、输出、滑点）
- 预计 Gas
- 风险提示

### 步骤 3：执行交易（TODO）

点击"一键签名并执行"：
1. 连接 Sui Wallet
2. 签名 PTB
3. 上链执行

---

## 🔧 开发指南

### 修改支持的 Actions

编辑 `lib/types.ts`：

```typescript
export type ActionType = 'swap' | 'split' | 'transfer' | 'stake'; // 添加 'stake'
```

编辑 `lib/ptb-builder.ts`：

```typescript
// 添加新的 action 构建逻辑
function buildStakePTB(tx: Transaction, params: StakeParams) {
  // ...
}
```

### 修改 Policy 限制

编辑 `lib/types.ts`：

```typescript
export const POLICY_LIMITS = {
  maxAmount: 1000,    // 最大交易金额
  maxSlippage: 0.05,  // 最大滑点 5%
  maxGas: 0.1,        // 最大 gas
  maxActions: 5,      // 最大 action 数量
};
```

### 替换 LLM 提供商

编辑 `app/api/intent/route.ts`：

```typescript
// 替换 DeepSeek 为 GPT-4
const OPENAI_API_URL = 'https://api.openai.com/v1';

const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
  body: JSON.stringify({
    model: 'gpt-4',
    // ...
  }),
});
```

---

## 🎯 黑客松提交清单

### 代码
- [x] GitHub 仓库
- [ ] 完整的 README
- [ ] 清晰的代码结构
- [ ] 单元测试（可选）

### Demo
- [ ] 3 分钟演示视频
- [ ] 测试网部署地址
- [ ] 交易记录截图

### 文档
- [ ] 项目介绍
- [ ] 技术架构
- [ ] 使用指南
- [ ] 未来规划

---

## 🐛 常见问题

### Q: LLM 解析失败怎么办？
A: 点击"试试这些"中的示例，或简化你的输入。系统会在置信度过低时提示。

### Q: 如何添加新的代币到白名单？
A: 编辑 `lib/types.ts` 中的 `TOKEN_ALLOWLIST`。

### Q: PTB 构建失败怎么办？
A: 检查参数是否在 Policy 限制内，查看控制台错误信息。

### Q: 测试币不够怎么办？
A: 访问 https://faucet.testnet.sui.io/ 领取。

---

## 🚀 下一步

### Day 2：完善功能
- [ ] 集成 Sui Wallet 连接
- [ ] 实现真实的 Swap（调用 DEX 协议）
- [ ] 添加交易历史记录
- [ ] 优化 UI/UX

### Day 3：打磨和提交
- [ ] 完整测试所有功能
- [ ] 录制 Demo 视频
- [ ] 编写项目文档
- [ ] 提交到 DeepSurge

---

## 📞 支持

- **问题反馈**: 在项目仓库提 Issue
- **技术咨询**: 联系 @0xHOH（Twitter）
- **Sui 开发文档**: https://docs.sui.io/

---

## 🙏 致谢

- **Turing** - 项目方向建议
- **Codex** - 技术方案校对
- **Sui Foundation** - 黑客松组织
- **DeepSurge** - 平台支持

---

**祝你好运，拿下 Mac mini！🎉**
