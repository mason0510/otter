/**
 * Intent Agent 配置
 */

// 授权合约 Package ID（已部署到主网）
// 这个地址会在用户创建授权时作为 agent 参数使用
export const AUTH_PACKAGE_ID = process.env.NEXT_PUBLIC_AUTH_PACKAGE_ID || '0x91f2fdf66111c9eada5c6c17a360ea3a1bf6e54e72c4589b0b10279627cc6371';

// Swap Wrapper 合约 Package ID
// 注意：swap_wrapper 模块已集成到 authorization 包中
// 2026-02-10 升级到 v3（统一授权架构）
export const SWAP_WRAPPER_PACKAGE_ID = "0x3724706eedf587b87475f9b9560f7bccb31c3c783b9f1f48f2a1fc76885d5c3a";

// 默认授权参数（测试期间使用较小金额）
export const DEFAULT_AUTH_PARAMS = {
  dailyLimit: 0.1,      // 每日限额（SUI）
  perTxLimit: 0.1,      // 单笔限额（SUI）
  validityDays: 30,     // 有效期（天）,
};

// 授权对象存储（用户创建授权后保存到 localStorage）
export const AUTH_OBJECT_KEY = 'otter_auth_object_id';

// 支持的代币类型
export const SUPPORTED_TOKENS = ['SUI', 'USDT', 'USDC'] as const;
export type SupportedToken = typeof SUPPORTED_TOKENS[number];
