"use strict";
/**
 * Sui Intent Agent - 类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLICY_LIMITS = exports.TOKEN_ALLOWLIST = void 0;
// Token 白名单
exports.TOKEN_ALLOWLIST = {
    SUI: {
        type: 'SUI',
        decimals: 9,
        symbol: 'SUI',
        address: '0x2', // SUI 原生代币
    },
    USDT: {
        type: 'Coin',
        decimals: 6,
        symbol: 'USDT',
        address: '0x...', // 测试网 USDT 地址
    },
    USDC: {
        type: 'Coin',
        decimals: 6,
        symbol: 'USDC',
        address: '0x...', // 测试网 USDC 地址
    },
};
// Policy 限制
exports.POLICY_LIMITS = {
    maxAmount: 1000,
    maxSlippage: 0.05, // 5%
    maxGas: 0.1,
    maxActions: 5,
};
