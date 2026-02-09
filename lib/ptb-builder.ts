/**
 * Sui Intent Agent - PTB 构建器
 *
 * 核心功能：
 * 1. 构建可验证的 PTB (Programmable Transaction Blocks)
 * 2. 生成人类可读的摘要
 * 3. 参数校验
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import type { Intent, PTBSummary, ActionType, SwapParams, SplitParams, TransferParams } from './types';
import { TOKEN_ALLOWLIST, POLICY_LIMITS } from './types';

/**
 * 校验单个 Intent
 */
function validateIntent(intent: Intent): { valid: boolean; error?: string } {
  // 校验 Action 类型
  const validActions: ActionType[] = ['swap', 'split', 'transfer'];
  if (!validActions.includes(intent.action)) {
    return { valid: false, error: `不支持的 action: ${intent.action}` };
  }

  // 校验置信度
  if (intent.confidence < 0.7) {
    return { valid: false, error: 'LLM 置信度过低，请重新表述' };
  }

  const params = intent.params;

  // 校验 Swap
  if (intent.action === 'swap') {
    const p = params as SwapParams;

    // Token 必须在白名单
    if (!TOKEN_ALLOWLIST[p.inputToken as keyof typeof TOKEN_ALLOWLIST]) {
      return { valid: false, error: `输入代币不在白名单: ${p.inputToken}` };
    }
    if (!TOKEN_ALLOWLIST[p.outputToken as keyof typeof TOKEN_ALLOWLIST]) {
      return { valid: false, error: `输出代币不在白名单: ${p.outputToken}` };
    }

    // 金额检查
    const amount = parseFloat(p.amount);
    if (isNaN(amount) || amount <= 0 || amount > POLICY_LIMITS.maxAmount) {
      return { valid: false, error: `金额无效或超出限制: ${p.amount}` };
    }

    // 滑点检查
    const slippage = parseFloat(p.slippage);
    if (isNaN(slippage) || slippage < 0 || slippage > POLICY_LIMITS.maxSlippage) {
      return { valid: false, error: `滑点无效或超出限制: ${p.slippage}` };
    }
  }

  // 校验 Split
  if (intent.action === 'split') {
    const p = params as SplitParams;

    if (!TOKEN_ALLOWLIST[p.token as keyof typeof TOKEN_ALLOWLIST]) {
      return { valid: false, error: `代币不在白名单: ${p.token}` };
    }

    // 检查比例总和是否为 100%
    const totalPercentage = p.splits.reduce((sum, split) => {
      const match = split.match(/(\d+(\.\d+)?)%/);
      if (!match) return sum;
      return sum + parseFloat(match[1]);
    }, 0);

    if (Math.abs(totalPercentage - 100) > 0.1) {
      return { valid: false, error: `拆分比例必须总和为 100%，当前: ${totalPercentage}%` };
    }
  }

  // 校验 Transfer
  if (intent.action === 'transfer') {
    const p = params as TransferParams;

    if (!TOKEN_ALLOWLIST[p.token as keyof typeof TOKEN_ALLOWLIST]) {
      return { valid: false, error: `代币不在白名单: ${p.token}` };
    }

    const amount = parseFloat(p.amount);
    if (isNaN(amount) || amount <= 0 || amount > POLICY_LIMITS.maxAmount) {
      return { valid: false, error: `金额无效或超出限制: ${p.amount}` };
    }

    // Sui 地址格式校验（简单检查）
    if (!p.recipient.startsWith('0x') || p.recipient.length !== 66) {
      return { valid: false, error: `无效的 Sui 地址: ${p.recipient}` };
    }
  }

  return { valid: true };
}

/**
 * 构建 Swap PTB
 */
function buildSwapPTB(tx: TransactionBlock, params: SwapParams) {
  const { inputToken, outputToken, amount, slippage } = params;

  // 注意：这里调用现有的 DEX 协议（如 Kriya、CETUS）
  // 实际生产中需要根据具体协议的 API 调用
  // MVP 版本：使用简化的 swap 逻辑

  tx.moveCall({
    target: '0x...::dex::swap', // 替换为实际的 DEX 合约地址
    arguments: [
      tx.pure.address(inputToken === 'SUI' ? '0x2' : TOKEN_ALLOWLIST[inputToken as keyof typeof TOKEN_ALLOWLIST].address),
      tx.pure.address(outputToken === 'SUI' ? '0x2' : TOKEN_ALLOWLIST[outputToken as keyof typeof TOKEN_ALLOWLIST].address),
      tx.pure.u64(Math.floor(parseFloat(amount) * 1e9)), // 假设 9 位小数
      tx.pure.u64(Math.floor(parseFloat(slippage) * 100)), // 3% = 300
    ],
  });

  return {
    description: `Swap ${amount} ${inputToken} → ${outputToken}`,
    details: {
      input: `${amount} ${inputToken}`,
      output: `~${(parseFloat(amount) * 0.98).toFixed(2)} ${outputToken}`, // 简化估算
      slippage: `${(parseFloat(slippage) * 100).toFixed(1)}%`,
    },
  };
}

/**
 * 构建 Split PTB
 */
function buildSplitPTB(tx: TransactionBlock, params: SplitParams) {
  const { token, splits, recipients } = params;

  // 如果提供了接收地址，则直接分配
  if (recipients && recipients.length === splits.length) {
    for (let i = 0; i < splits.length; i++) {
      const percentage = parseFloat(splits[i].replace('%', '')) / 100;
      const amount = Math.floor(100 * 1e9 * percentage); // 假设拆分 100 个代币

      tx.transferObjects(
        [tx.splitCoins(tx.gas, [tx.pure.u64(amount)])[0]],
        recipients[i]
      );
    }
  }

  return {
    description: `Split ${token} into ${splits.length} parts`,
    details: {
      token,
      splits: splits.join(', '),
    },
  };
}

/**
 * 构建 Transfer PTB
 */
function buildTransferPTB(tx: TransactionBlock, params: TransferParams) {
  const { token, amount, recipient } = params;

  // 简化版本：从 gas 中拆分代币并转账
  const amountInBaseUnits = Math.floor(parseFloat(amount) * 1e9);

  tx.transferObjects(
    [tx.splitCoins(tx.gas, [tx.pure.u64(amountInBaseUnits)])[0]],
    recipient
  );

  return {
    description: `Transfer ${amount} ${token} to ${recipient.slice(0, 8)}...`,
    details: {
      token,
      amount,
      recipient: recipient.slice(0, 10) + '...',
    },
  };
}

/**
 * 构建完整的 PTB（包含多个 intents）
 */
export async function buildPTB(intents: Intent[]): Promise<{
  tx: TransactionBlock;
  summary: PTBSummary;
  error?: string;
}> {
  // 1. 校验所有 intents
  for (const intent of intents) {
    const validation = validateIntent(intent);
    if (!validation.valid) {
      return {
        tx: new TransactionBlock(),
        summary: { actions: [], totalSteps: 0, estimatedGas: '0', risks: [], warnings: [] },
        error: validation.error,
      };
    }
  }

  // 2. 检查 Action 数量限制
  if (intents.length > POLICY_LIMITS.maxActions) {
    return {
      tx: new TransactionBlock(),
      summary: { actions: [], totalSteps: 0, estimatedGas: '0', risks: [], warnings: [] },
      error: `Action 数量超过限制: ${intents.length} > ${POLICY_LIMITS.maxActions}`,
    };
  }

  // 3. 构建 PTB
  const tx = new TransactionBlock();
  const summary: PTBSummary = {
    actions: [],
    totalSteps: 0,
    estimatedGas: '0.01',
    risks: [],
    warnings: [],
  };

  for (const intent of intents) {
    const params = intent.params;

    try {
      if (intent.action === 'swap') {
        const result = buildSwapPTB(tx, params as SwapParams);
        summary.actions.push({
          type: 'swap',
          description: result.description,
          details: result.details,
        });
        summary.totalSteps++;
        summary.risks.push('价格波动可能影响实际输出');
      }

      if (intent.action === 'split') {
        const result = buildSplitPTB(tx, params as SplitParams);
        summary.actions.push({
          type: 'split',
          description: result.description,
          details: result.details,
        });
        summary.totalSteps++;
      }

      if (intent.action === 'transfer') {
        const result = buildTransferPTB(tx, params as TransferParams);
        summary.actions.push({
          type: 'transfer',
          description: result.description,
          details: result.details,
        });
        summary.totalSteps++;
        summary.risks.push('转账后不可撤销');
      }
    } catch (error) {
      return {
        tx,
        summary,
        error: `构建 ${intent.action} PTB 失败: ${error}`,
      };
    }
  }

  return { tx, summary };
}

/**
 * 生成人类可读的摘要（Markdown 格式）
 */
export function generateMarkdownSummary(summary: PTBSummary): string {
  let markdown = '## 📋 交易摘要\n\n';

  summary.actions.forEach((action, index) => {
    markdown += `### 操作 ${index + 1}: ${action.type.toUpperCase()}\n\n`;
    markdown += `${action.description}\n\n`;

    Object.entries(action.details).forEach(([key, value]) => {
      markdown += `- **${key}**: ${value}\n`;
    });

    markdown += '\n';
  });

  markdown += '---\n\n';
  markdown += `**总步骤**: ${summary.totalSteps}\n`;
  markdown += `**预计 Gas**: ${summary.estimatedGas} SUI\n`;

  if (summary.risks.length > 0) {
    markdown += '\n### ⚠️ 风险提示\n\n';
    summary.risks.forEach((risk) => {
      markdown += `- ${risk}\n`;
    });
  }

  if (summary.warnings.length > 0) {
    markdown += '\n### ⚡ 注意事项\n\n';
    summary.warnings.forEach((warning) => {
      markdown += `- ${warning}\n`;
    });
  }

  markdown += '\n---\n\n';
  markdown += '✅ **签名后，以上操作将原子执行（要么全部成功，要么全部失败）**\n';

  return markdown;
}
