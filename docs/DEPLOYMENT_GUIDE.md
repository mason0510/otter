# Swap Wrapper 合约部署指南

## 前置条件

1. **安装 Sui CLI**
   ```bash
   # macOS (Homebrew)
   brew install sui

   # Linux
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
   ```

2. **配置 Sui 客户端**
   ```bash
   # 创建新钱包（如果没有）
   sui client new-address ed25519 keychain

   # 查看当前地址
   sui client active-address

   # 查看余额
   sui client gas
   ```

3. **确保有足够的 SUI 用于部署**
   - 部署约需要 0.1-0.2 SUI
   - 可在 [Sui Discord](https://discord.gg/sui) 获取测试网水龙头（测试时）
   - 或在主网购买 SUI（生产部署）

## 网络问题解决方案

### 问题：GitHub 访问受限

如果遇到 `Error in the HTTP2 framing layer` 错误：

**方法 1：使用 Git 代理**
```bash
# 设置代理（根据实际情况修改）
git config --global http.proxy socks5://117.50.199.77:3080
git config --global https.proxy socks5://117.50.199.77:3080

# 编译完成后取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

**方法 2：使用 Gitee 镜像（推荐）**
```bash
# 修改 Move.toml 使用镜像
[dependencies]
Sui = { git = "https://gitee.com/mysten/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/mainnet" }
```

**方法 3：使用已编译的本地框架**
```bash
# 直接使用 Homebrew 安装的 Sui CLI 附带的 framework
sui move build
```

## 部署步骤

### 步骤 1：编译合约

```bash
cd move/sources/swap-wrapper

# 编译合约
sui move build

# 检查编译输出
ls -la build/
```

预期输出：
```
total 24
drwxr-xr-x  6 user  staff   192 May 10 12:00 .
drwxr-xr-x  3 user  staff    96 May 10 12:00 ..
drwxr-xr-x  3 user  staff    96 May 10 12:00 swap_wrapper
```

### 步骤 2：部署到 Sui 主网

```bash
# 部署合约（使用默认 gas budget）
sui client publish

# 或指定 gas budget
sui client publish --gas-budget 100000000
```

预期输出：
```
Transaction Digest: [TRANSACTION_DIGEST]
╭────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Transaction Details                                                                             │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PackageID:                                                                                     │
│ ┌──                                                                                              │
│ │ 0x[PACKAGE_ID]                                                                                 │
│ └──                                                                                              │
│ Version:                                                                                        │
│ ┌──                                                                                              │
│ │ 1                                                                                              │
│ └──                                                                                              │
│                                                                ...
```

**重要：复制 PackageID（类似 `0x1234...abcd`）**，后续需要使用。

### 步骤 3：验证部署

```bash
# 查看已部署的包
sui client object [PACKAGE_ID]

# 或在 SuiScan 查看
# https://suiscan.xyz/mainnet/object/[PACKAGE_ID]
```

### 步骤 4：更新前端配置

创建或编辑 `.env.local` 文件：

```bash
NEXT_PUBLIC_SWAP_WRAPPER_PACKAGE_ID=0x[复制的_PACKAGE_ID]
```

或编辑 `lib/config.ts`：

```typescript
export const SWAP_WRAPPER_PACKAGE_ID = '0x[复制的_PACKAGE_ID]';
```

### 步骤 5：重启开发服务器

```bash
# 停止当前服务（Ctrl+C）
# 重新启动
npm run dev
```

## 测试部署

### 1. 创建授权

访问 `http://localhost:3000/authorize`：

- 每日限额：`0.1` SUI
- 单笔限额：`0.1` SUI
- 有效期：`30` 天

点击"创建授权"并签名交易。

### 2. 测试授权 Swap

返回主页面，输入：
```
把 0.001 SUI 换成 USDC，滑点 1%
```

点击"开始执行"，应该看到：
- 绿色"授权模式"指示器
- 显示"Swap Wrapper 已部署"

### 3. 执行交易

点击"确认并签名"，检查：
- 只需签名一次
- 交易成功执行
- 授权额度被扣除

## 常见问题

### Q1: 编译失败，提示找不到 Sui framework

**解决：** 确保 Sui CLI 已正确安装
```bash
sui --version
# 应显示类似：sui 1.65.1
```

### Q2: 部署失败，余额不足

**解决：**
```bash
# 查看当前余额
sui client gas

# 如果余额 < 0.2 SUI，需要充值
# 主网充值地址：sui client active-address
```

### Q3: 部署成功但前端不识别

**解决：** 检查配置是否正确
```bash
# 检查 .env.local 文件
cat .env.local | grep SWAP_WRAPPER

# 或检查代码
grep SWAP_WRAPPER_PACKAGE_ID lib/config.ts
```

### Q4: Swap 交易失败

**可能原因：**
1. 授权对象未创建或已过期
2. 授权限额不足
3. Swap Wrapper 合约地址配置错误

**排查：**
```bash
# 查看授权状态
访问 /authorize 页面

# 检查控制台日志
浏览器 F12 → Console → 查找错误信息
```

## 生产环境注意事项

### 1. Gas 优化

部署时使用合理的 gas budget：
```bash
sui client publish --gas-budget 50000000
```

### 2. 版本管理

建议使用 Git tag 管理版本：
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. 安全检查

部署前检查：
- [ ] 授权限额检查逻辑正确
- [ ] 滑点保护已实现
- [ ] 事件日志完整
- [ ] 无后门或可疑代码

### 4. 监控

建议添加监控：
- 部署成功后记录 Package ID
- 定期检查授权使用情况
- 记录交易失败日志

## 回滚方案

如果部署出现问题：

### 1. 前端回滚

```bash
# 重置配置
export NEXT_PUBLIC_SWAP_WRAPPER_PACKAGE_ID="0x0"

# 或编辑 lib/config.ts
# SWAP_WRAPPER_PACKAGE_ID = '0x0';
```

### 2. 继续使用标准模式

即使 Swap Wrapper 未部署，前端会自动降级为标准模式：
- 用户需要每次签名
- 但功能完全可用

## 相关资源

- **Sui 官方文档**: https://docs.sui.io/
- **Move 语言指南**: https://move-book.com/
- **Sui Wallet**: https://suiwallet.com/
- **SuiScan**: https://suiscan.xyz/

## 支持

如遇到问题：
1. 检查本文档的"常见问题"部分
2. 查看项目 GitHub Issues
3. 联系开发团队
