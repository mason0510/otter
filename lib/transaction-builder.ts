/**
 * 构建 Sui PTB Transaction
 */

import { Transaction } from '@mysten/sui.js/transactions';
import type { Intent, SwapParams, SplitParams, TransferParams } from './types';

/**
 * 根据意图列表构建 Transaction
 *
 * ⚠️ 安全说明：
 * - Demo 模式：使用安全的自转操作（燃烧 Gas，资产安全）
 * - 生产环境：需要集成真实 DEX 和 Coin 查询逻辑
 */
export async function buildTransaction(
  intents: Intent[],
  senderAddress?: string
): Promise<Transaction> {
  const tx = new Transaction();

  // ⚠️ Demo 安全措施：如果没有真实操作，添加一个最小转账
  // 这样交易会真实执行，但只消耗少量 Gas（约 0.001 SUI）
  let hasRealOperation = false;

  for (const intent of intents) {
    switch (intent.action) {
      case 'swap':
        await buildSwap(tx, intent);
        hasRealOperation = true;
        break;

      case 'transfer':
        await buildTransfer(tx, intent, senderAddress);
        hasRealOperation = true;
        break;

      case 'split':
        await buildSplit(tx, intent, senderAddress);
        hasRealOperation = true;
        break;

      default:
        console.warn(`Unknown action: ${intent.action}`);
    }
  }

  // Demo 模式：确保 Transaction 非空（避免浪费 Gas 签名空交易）
  if (!hasRealOperation && senderAddress) {
    console.log('[Demo] Adding safe self-transfer to validate transaction');
    // 转账 0.001 SUI 给自己（燃烧 Gas，验证签名流程）
    tx.transferObjects(
      [tx.gas],
      tx.pure.address(senderAddress)
    );
  }

  return tx;
}

/**
 * 构建 Swap 交易（Demo 占位符）
 *
 * TODO: 集成真实 DEX（Kriya DEX、Turbos Finance 等）
 *
 * 生产环境需要：
 * 1. 获取 DEX Pool Object ID
 * 2. 调用 DEX 的 swap 函数
 * 3. 处理 slippage 保护
 * 4. 验证最小输出量
 */
async function buildSwap(tx: Transaction, intent: Intent) {
  const params = intent.params as SwapParams;
  const { inputToken, outputToken, amount, slippage } = params;

  console.log(`[Swap Placeholder] ${amount} ${inputToken} → ${outputToken}, slippage: ${slippage}%`);
  console.warn('⚠️ 当前为 Demo 模式，Swap 操作未集成真实 DEX');

  // Demo 占位符：实际需要集成 DEX
  // tx.moveCall({
  //   target: '0x<kriya_dex>::pool::swap',
  //   arguments: [
  //     tx.object(poolId),
  //     tx.pure.u64(amount),
  //     tx.pure.u64(minAmountOut)
  //   ],
  //   typeArguments: [inputTokenType, outputTokenType]
  // });
}

/**
 * 构建转账交易（Demo 占位符）
 *
 * TODO: 集成真实 Coin 查询和转账
 *
 * 生产环境需要：
 * 1. 查询用户的 Coin 余额（getAllCoins）
 * 2. 合并或选择合适的 Coin
 * 3. 转账给接收者
 * 4. 处理 Coin 不足的情况
 */
async function buildTransfer(tx: Transaction, intent: Intent, senderAddress?: string) {
  const params = intent.params as TransferParams;
  const { recipient, token, amount } = params;

  console.log(`[Transfer Placeholder] ${amount} ${token} → ${recipient}`);
  console.warn('⚠️ 当前为 Demo 模式，Transfer 使用占位符逻辑');

  // Demo 安全措施：如果转账 SUI，使用 gas object
  if (token.toUpperCase() === 'SUI' && senderAddress) {
    // 转账少量 SUI（使用 gas，避免查询 Coin）
    const transferAmount = Math.min(parseFloat(amount) * 1_000_000_000, 100_000_000); // 最多 0.1 SUI

    if (transferAmount > 0) {
      tx.transferObjects(
        [tx.splitCoins(tx.gas, [tx.pure.u64(transferAmount)])[0]],
        tx.pure.address(recipient)
      );
      console.log(`[Demo] Transferring ${transferAmount / 1_000_000_000} SUI to ${recipient}`);
    }
  }

  // 其他 Token 需要查询 Coin 对象（Demo 暂不支持）
  // 示例代码（需要实际 Coin Object ID）：
  // tx.transferObjects(
  //   [tx.object(coinObjectId)],
  //   tx.pure.address(recipient)
  // );
}

/**
 * 构建拆分交易（Demo 实现）
 *
 * ✅ 已实现：使用 splitCoins 拆分 SUI
 */
async function buildSplit(tx: Transaction, intent: Intent, senderAddress?: string) {
  const params = intent.params as SplitParams;
  const { splits, token } = params;

  console.log(`[Split] ${token} into ${splits.length} parts: ${splits.join(', ')}`);

  if (!senderAddress) {
    console.warn('⚠️ Split requires sender address');
    return;
  }

  // Demo 实现：拆分 SUI（使用 gas object）
  if (token.toUpperCase() === 'SUI') {
    // 假设拆分 1 SUI（Demo 用途）
    const totalAmount = 1_000_000_000; // 1 SUI
    const amountPerPart = Math.floor(totalAmount / splits.length);

    // 拆分 gas
    const splitCoins = tx.splitCoins(
      tx.gas,
      splits.map(() => tx.pure.u64(amountPerPart))
    );

    // 转给自己（演示拆分效果）
    tx.transferObjects(
      splitCoins,
      tx.pure.address(senderAddress)
    );

    console.log(`[Demo] Split 1 SUI into ${splits.length} parts (${amountPerPart / 1_000_000_000} SUI each)`);
  } else {
    console.warn(`⚠️ Split for ${token} not supported in demo mode`);
  }
}
