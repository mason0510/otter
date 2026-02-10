# 服务器部署命令（直接复制执行）

## 当前进度

✅ 1. 合约代码已编译
✅ 2. 代码已上传到服务器
✅ 3. 部署文档已准备
⏳ 4. **等待在服务器上执行部署**
⏳ 5. 验证部署结果

---

## 快速部署（3条命令）

登录服务器后执行：

```bash
# 1. 安装 Sui CLI（如果未安装）
wget https://github.com/MystenLabs/sui/releases/download/mainnet-v1.37.1/sui-mainnet-v1.37.1-ubuntu-x86_64 && chmod +x sui-mainnet-v1.37.1-ubuntu-x86_64 && sudo mv sui-mainnet-v1.37.1-ubuntu-x86_64 /usr/local/bin/sui

# 2. 编译合约
cd /root/authorization-package && sui move build

# 3. 部署合约
sui client upgrade --upgrade-capability 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 --gas-budget 100000000
```

---

## 详细步骤

### 1️⃣ 登录服务器

```bash
ssh root@82.29.54.80
```

### 2️⃣ 检查 Sui CLI

```bash
sui --version
```

如果未安装，执行：

```bash
cd /tmp
wget https://github.com/MystenLabs/sui/releases/download/mainnet-v1.37.1/sui-mainnet-v1.37.1-ubuntu-x86_64
chmod +x sui-mainnet-v1.37.1-ubuntu-x86_64
sudo mv sui-mainnet-v1.37.1-ubuntu-x86_64 /usr/local/bin/sui
sui --version  # 验证安装
```

### 3️⃣ 检查合约代码

```bash
cd /root
ls -la authorization-package/
```

如果目录不存在，需要重新上传。

### 4️⃣ 编译合约

```bash
cd /root/authorization-package
sui move build
```

预期输出：
```
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING authorization
```

### 5️⃣ 检查钱包和余额

```bash
# 查看当前地址
sui client active-address

# 查看余额（需要 ≥0.05 SUI）
sui client gas
```

如果余额不足，需要充值后再继续。

### 6️⃣ 执行部署

```bash
sui client upgrade \
  --upgrade-capability 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 \
  --gas-budget 100000000
```

### 7️⃣ 记录输出

部署成功后，输出中会包含：

```
----- Upgraded Package -----
Package ID: 0x<新的PackageID>
...
```

**重要：复制这个新的 Package ID！**

---

## 部署后验证

### 验证模块存在

```bash
sui client object <新的PackageID> --json | grep swap_wrapper
```

应该看到 `swap_wrapper` 模块。

### 验证函数存在

```bash
sui client call --function execute_swap_with_auth --package <新的PackageID> --module swap_wrapper --dry-run
```

---

## 更新前端配置

部署成功后，在本地项目更新 `lib/config.ts`：

```typescript
export const SWAP_WRAPPER_PACKAGE_ID = "0x<新的PackageID>";
```

---

## 故障排查

### 问题1: Sui CLI 未安装

```bash
sui: command not found
```

**解决**：按步骤2安装 Sui CLI

### 问题2: 余额不足

```bash
Cannot find gas coin for signer address
```

**解决**：充值 ≥0.05 SUI 到钱包

### 问题3: 编译失败

```bash
error[E...]: ...
```

**解决**：检查 Move.toml 和源代码是否完整

### 问题4: Upgrade Capability 不匹配

```bash
Invalid upgrade capability
```

**解决**：确认使用正确的 upgrade capability object ID

---

## 关键信息

| 项目 | 值 |
|------|-----|
| 服务器 | 82.29.54.80 |
| 合约目录 | /root/authorization-package |
| Package ID | 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 |
| Upgrade Cap | 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 |
| 网络 | Mainnet |
| Gas Budget | 100000000 (0.1 SUI) |

---

## 需要帮助？

如果遇到问题，提供以下信息：
1. 错误信息完整输出
2. `sui client active-address` 输出
3. `sui client gas` 输出
4. `sui move build` 输出
