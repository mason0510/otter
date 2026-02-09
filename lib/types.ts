/**
 * Sui Intent Agent - 类型定义
 */

// 支持的 Action 类型
export type ActionType = 'swap' | 'split' | 'transfer';

// Swap 参数
export interface SwapParams {
  inputToken: string;
  outputToken: string;
  amount: string;
  slippage: string; // 0.01 = 1%
}

// Split 参数
export interface SplitParams {
  token: string;
  splits: string[]; // ["50%", "50%"]
  recipients?: string[]; // 如果提供，则直接分配
}

// Transfer 参数
export interface TransferParams {
  token: string;
  amount: string;
  recipient: string;
}

// 所有 Action 参数的联合类型
export type ActionParams = SwapParams | SplitParams | TransferParams;

// 单个 Intent
export interface Intent {
  action: ActionType;
  params: ActionParams;
  confidence: number; // 0-1
}

// PTB 摘要
export interface PTBSummary {
  actions: Array<{
    type: ActionType;
    description: string;
    details: Record<string, string | number>;
  }>;
  totalSteps: number;
  estimatedGas: string;
  risks: string[];
  warnings: string[];
}

// Token 白名单
export const TOKEN_ALLOWLIST = {
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
} as const;

export type TokenInfo = typeof TOKEN_ALLOWLIST[keyof typeof TOKEN_ALLOWLIST];

// Policy 限制
export const POLICY_LIMITS = {
  maxAmount: 1000,
  maxSlippage: 0.05, // 5%
  maxGas: 0.1,
  maxActions: 5,
};

// LLM 响应 schema
export interface LLMIntentResponse {
  intents: Intent[];
  summary: string;
  confidence: number;
}
