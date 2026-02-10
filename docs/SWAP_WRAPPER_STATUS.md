# Swap Wrapper 部署状态

## ✅ 已完成

### 1. 合约开发
- **模块名**: `authorization::swap_wrapper`
- **功能**: 授权模式 Swap，无需重复签名
- **状态**: ✅ 编译成功，已集成到 authorization package

### 2. 前端配置
- **配置文件**: `lib/config.ts`
- **Package ID**: `SWAP_WRAPPER_PACKAGE_ID = AUTH_PACKAGE_ID`
- **状态**: ✅ 前端已完全配置就绪

### 3. 构建产物
```
move/sources/authorization/build/authorization/bytecode_modules/
├── auth.mv              (已部署)
└── swap_wrapper.mv      (待升级部署)
```

## 🔄 待完成

### 部署到主网

**当前限制**: 钱包 gas 不足 (0.031 SUI，需要 ~0.05 SUI)

**部署命令**:
```bash
cd /Users/houzi/code/06-production-business-money-live/sui-intent-agent/move/sources/authorization
sui client upgrade \
  -c 0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824 \
  --gas-budget 100000000
```

**需要**:
- 向钱包 `0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225` 充值至少 0.05 SUI
- 或从其他钱包执行升级

## 📋 合约接口

### execute_swap_with_auth
```move
public fun execute_swap_with_auth(
    auth: &mut Authorization,
    input_coin: Coin<SUI>,
    _min_output: u64,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**调用示例**:
```typescript
tx.moveCall({
  target: `${AUTH_PACKAGE_ID}::swap_wrapper::execute_swap_with_auth`,
  arguments: [
    tx.object(authObjectId),
    tx.gas,
    tx.pure.u64(minOutput),
    tx.object('0x6'),
  ],
});
```

## 🎯 使用流程

1. **用户创建授权** (authorization::auth::create_authorization)
2. **Agent 调用 Swap** (使用授权对象)
3. **无需用户重复签名**
4. **自动更新使用量**

## 📊 技术细节

- **Package**: `0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371`
- **Module**: `authorization::swap_wrapper`
- **Upgrade Capability**: `0x5b6445cbb5b1d454d8a8854d2231ad027f48706a24fc71d509f1f96f8bed2824`
- **当前版本**: v1 → v2 (升级后)

## 🚀 部署后验证

```bash
# 查看已部署模块
sui client object 0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371

# 应该看到两个模块：
# - authorization::auth
# - authorization::swap_wrapper
```

## ✨ 前端已就绪

一旦升级完成，前端将自动启用 Swap 授权模式：
- 自动检测授权对象
- 使用 `authorization::swap_wrapper` 执行 Swap
- 无需重复签名

## 📝 注意事项

- 当前 Swap Wrapper 仅支持 SUI 作为输入代币
- 需要预先创建授权对象
- 每日限额和单笔限额检查
- 自动重置每日使用量

---
**生成时间**: 2026-02-10
**状态**: 待部署（等待 gas 充值）
