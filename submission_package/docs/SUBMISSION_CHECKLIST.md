# 🚀 黑客松提交快速参考

> Vibe Sui Spring Fest 2026 | Sui Intent Agent

---

## ✅ 已完成的材料

### 1. 项目文档
- ✅ README.md（完整的项目介绍）
- ✅ CODE_AUDIT_REPORT.md（代码审核报告）
- ✅ HACKATHON_SUBMISSION.md（提交材料文档）
- ✅ demo_recording_guide.md（Demo 录制指南）
- ✅ QUICK_REF.html（快速参考）

### 2. 技术栈
- ✅ Next.js 15 + React
- ✅ @mysten/dapp-kit（钱包集成）
- ✅ Tailwind CSS + shadcn/ui（UI）
- ✅ DeepSeek API（AI 意图解析）

### 3. 部署
- ✅ 服务器部署：http://82.29.54.80:3025
- ✅ Sui Testnet 可用

---

## ⏳ 待完成的材料

### 🎬 1. Demo 视频（3-5分钟）

**参考文件**: `demo_recording_ppt/demo_recording_ppt.pptx`

**录制场景**：
1. 钱包连接（30秒）
2. 简单 Swap（40秒）
3. 组合操作（50秒）
4. 安全验证（30秒）
5. 智能拆分（30秒）

**录制命令**：
```bash
# macOS 内置录制
# 按 Cmd + Shift + 5 选择录制区域

# 或使用 CleanShot X（推荐）
```

**上传到 YouTube**：
1. 登录 YouTube
2. 点击 "上传"
3. 选择视频文件
4. 设置为 "Unlisted" 或 "Public"
5. 获取链接

---

### 📸 2. 项目截图（3-5张）

**截图场景**：

#### 截图 1: 首页
```bash
# 1. 启动开发服务器
cd /Users/houzi/code/06-production-business-money-live/website-fetch-analysize-data-skills/sui-intent-agent
npm run dev

# 2. 访问 http://localhost:3000

# 3. 截取首页（Cmd + Shift + 4）
```

#### 截图 2: AI 思考过程
```bash
# 1. 输入："把 10 SUI 换成 USDT，滑点 3%"
# 2. 点击 "解析意图"
# 3. 等待 5 步思考动画
# 4. 截图
```

#### 截图 3: 交易摘要
```bash
# 1. AI 思考完成后
# 2. 截取交易摘要卡片
# 3. 包含：Swap 操作、参数、Gas 费
```

#### 截图 4: 钱包连接
```bash
# 1. 连接 Sui Wallet
# 2. 截取绿色连接状态
# 3. 显示钱包地址
```

#### 截图 5: 交易成功
```bash
# 1. 执行交易
# 2. 截取成功提示
# 3. Transaction Digest
```

**截图命名**：
```
screenshot-1-home.png
screenshot-2-thinking.png
screenshot-3-summary.png
screenshot-4-wallet.png
screenshot-5-success.png
```

---

### 🎨 3. 项目 Logo

**设计建议**：
- **尺寸**: 512x512 (推荐)
- **格式**: PNG（透明背景）
- **主色调**: 紫色 (#8B5CF6) + 蓝色 (#3B82F6)
- **元素**: 对话气泡 + 链接符号
- **文字**: "Sui Intent Agent"（可选）

**快速生成方案**：
```bash
# 使用 AI 生成
# 提示词：Minimalist logo for blockchain project, purple and blue gradient, chat bubble + chain link icon, transparent background, 512x512

# 或使用在线工具
# https://www.canva.com/
# https://www.figma.com/
```

**Logo 位置**：
```
/logo/logo-512x512.png
/logo/logo-1024x1024.png
```

---

### 📝 4. 填写提交表单

**表单链接**: [DeepSurge 提交页面]

**填写内容**：

#### Basic Information
```
Project Name: Sui Intent Agent
Description: 用自然语言一键执行 Sui 链上复杂交易。用户只需输入 "把 10 SUI 换成 USDT，然后转一半给 Alice"，系统自动解析意图、生成可验证的 PTB、展示人类可读的交易摘要，一次签名完成所有操作。
Track: AI + Infra
Network: Sui Testnet
```

#### Team
```
Developer: Mason (@mason1)
Advisor: Ben (@bencon9999)
```

#### Links
```
GitHub: https://github.com/mason0510/otter
Website: http://82.29.54.80:3025
Demo Video: [YouTube 链接]
```

#### Media
```
[上传 3-5 张截图]
[上传 Logo]
```

---

## 🎯 提交前检查清单

### 代码仓库
- [ ] GitHub 仓库已公开
- [ ] README.md 完整
- [ ] LICENSE 文件
- [ ] .env.example 文件

### 部署
- [ ] 测试网可访问
- [ ] 钱包连接正常
- [ ] 交易可执行

### Demo
- [ ] 视频已录制
- [ ] 视频已上传到 YouTube
- [ ] 视频链接已获取

### 媒体
- [ ] 5 张截图已准备
- [ ] Logo 已设计
- [ ] 图片格式正确（JPG/PNG）

### 文档
- [x] 项目介绍
- [x] 技术架构
- [x] 使用指南
- [x] 提交清单

---

## 📅 时间规划

### 今天（2月9日）
- [x] 整理提交材料
- [ ] 录制 Demo 视频（1小时）
- [ ] 截取项目截图（30分钟）
- [ ] 设计 Logo（30分钟）

### 明天（2月10日）
- [ ] 上传视频到 YouTube（30分钟）
- [ ] 填写提交表单（1小时）
- [ ] 最终检查（30分钟）
- [ ] 提交！

---

## 📞 需要帮助？

**代码问题**：
- 查看代码审核报告：`CODE_AUDIT_REPORT.md`

**Demo 录制**：
- 查看 PPT 指南：`demo_recording_ppt/demo_recording_ppt.pptx`
- 查看快速参考：`QUICK_REF.html`

**提交材料**：
- 查看完整文档：`HACKATHON_SUBMISSION.md`

---

**祝提交成功！🎉**
**Good luck with the hackathon! 🚀**
