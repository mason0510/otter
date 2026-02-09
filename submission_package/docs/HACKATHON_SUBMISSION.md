# Otter - 黑客松提交材料

> 🦦 Smart as an Otter, Fast as Sui | Vibe Sui Spring Fest 2026 | AI + Infra 赛道

---

## 📋 基本信息（Basic Information）

### 项目名称
**Sui Intent Agent - Verified PTB Composer**

### 一句话描述（30字以内）
用自然语言一键执行 Sui 链上复杂交易，AI 驱动的可验证 PTB 组合器

### 详细描述（200字以内）
**核心创新**：自然语言 → 受限域意图 → Policy 校验 → 可验证的 PTB

**解决的问题**：
- 用户需要多次签名完成一次 DeFi 操作（swap → stake → transfer）
- 不理解交易内容，担心签错
- 操作复杂，需要理解 DEX、滑点、路由等概念

**我们的方案**：
- ✅ 用户输入："把 10 SUI 换成 USDT，然后转一半给 Alice"
- ✅ 系统输出：交易摘要 + 风险提示 + 一键签名
- ✅ 原子执行：所有操作在一个 PTB 中完成

**技术亮点**：
- 充分利用 Sui PTB 特性（原子多步操作）
- LLM + Policy 校验的创新结合
- 人类可读的交易摘要，降低使用门槛

### Logo / 项目图片
**Logo 设计建议**：
- 主色调：紫色（代表 AI）+ 蓝色（代表 Sui）
- 元素：对话气泡 + 链接符号（代表自然语言 → 链上交易）
- 风格：简洁、现代、科技感

**Logo 文件位置**（需创建）：
```
/logo-512x512.png   (512x512, 用于展示)
/logo-1024x1024.png  (1024x1024, 高清版本)
```

### Track 选择
🎯 **AI + Infra**（基础设施 + AI 工具）

理由：
- **AI**: 使用 LLM 解析自然语言意图
- **Infra**: 构建 Sui 交易编排基础设施
- 跨赛道创新：AI × Blockchain

### 部署网络
🌐 **Sui Testnet** (https://suiscan.xyz/testnet)

理由：
- MVP 在测试网验证
- 已部署可用
- 测试币易获取

---

## 👥 团队信息（Team）

### 主要开发者
- **Name**: Mason
- **Role**: 全栈开发 + 架构设计
- **GitHub**: @mason1

### 技术顾问
- **Name**: Ben
- **Twitter**: @bencon9999
- **Role**: POC 验证 + 技术指导

---

## 🔗 重要链接（Links）

### 1. GitHub 仓库（必需）
**URL**: https://github.com/your-org/sui-intent-agent

**仓库包含**：
- ✅ 完整源代码
- ✅ README.md（项目介绍 + 技术栈）
- ✅ CODE_AUDIT_REPORT.md（代码审核报告）
- ✅ demo_recording_guide.md（Demo 录制指南）
- ✅ QUICK_REF.html（快速参考文档）

**Quick Start**:
```bash
git clone https://github.com/your-org/sui-intent-agent.git
cd sui-intent-agent
npm install
cp .env.example .env
# 填入 DEEPSEEK_API_KEY
npm run dev
# 访问 http://localhost:3000
```

### 2. 网站地址（必需）
**部署地址**: http://82.29.54.80:3025

**说明**：
- 已部署到服务器
- 可直接访问体验
- 连接 Sui Wallet（Testnet）

### 3. Demo 视频（必需）
**视频标题**: Sui Intent Agent - 3分钟 Demo

**录制清单**（参考 `demo_recording_guide.md`）：

**场景 1: 钱包连接（30秒）**
- 打开应用
- 点击 "连接 Sui Wallet"
- 显示钱包地址 (0x8282...a236)
- 展示断开连接功能

**场景 2: 简单 Swap（40秒）**
- 输入："把 10 SUI 换成 USDT，滑点 3%"
- 点击 "解析意图"
- 展示 AI 思考动画（5步）
- 展示交易摘要
- 点击 "一键签名并执行"
- 在钱包中确认
- 显示 Transaction Digest

**场景 3: 组合操作（50秒）**
- 输入："把 10 SUI 换成 USDT，然后转一半给 0x7b62...8f3a"
- 展示两个 Action 的摘要
- 强调 "原子执行" 特性
- 签名并执行
- 查看 Explorer

**场景 4: 安全验证（30秒）**
- 输入："把 10 SUI 换成 USDT，滑点 50%"
- 展示风险提示："滑点过高，建议 1-3%"
- 修改为："滑点 2%"
- 重新解析，风险提示消失

**场景 5: 智能拆分（30秒）**
- 输入："把我的 SUI 平均分成 3 份"
- 展示拆分摘要
- 执行并查看结果

**视频要求**：
- 时长：3-5 分钟
- 分辨率：1920x1080 或 1440x900
- 格式：MP4
- 配置：清晰的鼠标移动 + 旁白解说（可选）

**视频上传**：
- YouTube: https://youtube.com/watch?v=your-video-id
- 或直接上传 MP4 文件

---

## 🖼️ 媒体材料（Media）

### 项目截图（3-5张）

#### 截图 1：首页展示
**内容**：
- 标题：Sui Intent Agent
- 副标题：自然语言 → 可验证的 PTB
- 钱包连接按钮
- 输入框："把 10 SUI 换成 USDT..."
- 紫色渐变背景

**文件**: `screenshot-home.png`

#### 截图 2：AI 思考过程
**内容**：
- 5 步思考动画
- 步骤 1-5 依次高亮
- 展示 AI 分析过程

**文件**: `screenshot-thinking.png`

#### 截图 3：交易摘要展示
**内容**：
- 操作 1: Swap（SUI → USDT）
- 操作 2: Transfer（50% → Alice）
- 风险提示卡片
- Gas 费估算
- 签名按钮

**文件**: `screenshot-summary.png`

#### 截图 4：钱包连接状态
**内容**：
- 绿色连接状态
- 钱包地址显示
- 断开连接按钮

**文件**: `screenshot-wallet.png`

#### 截图 5：交易成功
**内容**：
- Transaction Digest
- Explorer 链接
- 成功提示图标

**文件**: `screenshot-success.png`

---

## 📝 提交表单填写模板

```markdown
## Basic Information

**Project Name**: Sui Intent Agent

**Description**:
用自然语言一键执行 Sui 链上复杂交易。用户只需输入 "把 10 SUI 换成 USDT，然后转一半给 Alice"，系统自动解析意图、生成可验证的 PTB、展示人类可读的交易摘要，一次签名完成所有操作。充分利用 Sui PTB 特性，降低使用门槛，提升交易安全性。

**Track**: AI + Infra

**Network**: Sui Testnet

---

## Team

**Developer**: Mason (@mason1)
**Advisor**: Ben (@bencon9999)

---

## Links

**GitHub**: https://github.com/your-org/sui-intent-agent
**Website**: http://82.29.54.80:3025
**Demo Video**: https://youtube.com/watch?v=your-video-id

---

## Media

[Upload 3-5 screenshots as described above]
```

---

## ✅ 提交前检查清单

### 代码仓库
- [x] GitHub 仓库公开
- [x] README.md 完整
- [x] LICENSE 文件
- [x] .env.example 文件
- [x] 代码注释清晰

### 部署
- [x] 测试网可访问
- [x] 钱包连接正常
- [x] 交易可执行
- [x] Explorer 可查询

### Demo 视频
- [ ] 录制 3-5 分钟视频
- [ ] 上传到 YouTube
- [ ] 设置为公开（或 Unlisted）
- [ ] 获取视频链接

### 媒体材料
- [ ] 准备 3-5 张截图
- [ ] 设计项目 Logo
- [ ] 图片格式：JPG/PNG
- [ ] 图片大小：< 5MB 每张

### 文档
- [x] 项目介绍
- [x] 技术架构
- [x] 使用指南
- [x] 提交清单

---

## 🚀 下一步行动

### 立即执行（今天）
1. ✅ 推送代码到 GitHub
2. ⏳ 录制 Demo 视频（参考 PPT）
3. ⏳ 截取 5 张项目截图
4. ⏳ 设计项目 Logo

### 明天完成
1. ⏳ 上传视频到 YouTube
2. ⏳ 填写提交表单
3. ⏳ 最终检查
4. ⏳ 提交！

---

## 📞 联系方式

如有问题，联系：
- GitHub Issues: https://github.com/your-org/sui-intent-agent/issues
- Discord: [Your Discord ID]
- Twitter: @mason1

---

**祝提交成功！🎉**
