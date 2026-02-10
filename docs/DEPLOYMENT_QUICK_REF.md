# Swap Wrapper 部署快速参考

## 服务器登录

```bash
ssh root@82.29.54.80
```

## 一键安装 Sui CLI

```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --rev framework/mainnet sui
```

*等待 10-20 分钟*

## 验证安装

```bash
export PATH="$HOME/.cargo/bin:$PATH"
sui --version
```

## 配置钱包

```bash
# 查看当前地址
sui client active-address

# 查看余额
sui client gas
```

**需要至少 0.05 SUI**

## 部署合约

```bash
cd /root
sui move build
sui client upgrade -c 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 --gas-budget 100000000
```

## 验证部署

```bash
sui client object 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371
```

应该看到 `authorization::swap_wrapper` 模块 ✨

## 关键信息

- **Package ID**: `0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371`
- **Module**: `authorization::swap_wrapper`
- **Function**: `execute_swap_with_auth`
- **Upgrade Cap**: `0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824`

## 前端配置

前端已自动配置，无需修改。

`lib/config.ts`:
```typescript
export const SWAP_WRAPPER_PACKAGE_ID = AUTH_PACKAGE_ID;
```

## 测试清单

- [ ] Sui CLI 安装成功
- [ ] 钱包配置完成
- [ ] Gas 余额充足 (≥0.05 SUI)
- [ ] 合约编译成功
- [ ] 合约部署成功
- [ ] Package 对象包含 swap_wrapper 模块
- [ ] 前端显示 "Swap 支持授权模式"
- [ ] 测试 Swap 授权模式成功

---
**快速参考** | 2026-02-10
