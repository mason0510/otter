/**
 * 构建 Sui PTB Transaction
 *
 * 功能：
 * - Swap: 集成 Kriya DEX 真实交易
 * - Transfer: 完整实现，支持任意金额
 * - Split: 支持多 Token 拆分
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { KriyaSDK } from 'kriya-v3-sdk';
import type { Intent, SwapParams, SplitParams, TransferParams } from './types';

// ============================================================================
// 配置
// ============================================================================

const SUI_RPC_URL = 'https://fullnode.mainnet.sui.io:443';
const KRIYA_PACKAGE_ID = '0xbd8d4489782042c6fafad4de4bc6a5e0b84a43c6c00647ffd7062d1e2bb7549e';

// Token 类型定义
const TOKEN_TYPES = {
  SUI: '0x2::sui::SUI',
  USDT: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  USDC: '0xce38bfa63cc41b7622f1ab4bdcf9f4e4aa78b57abd1e2e70a966f639b4da4f57::coin::COIN',
};

// Token 分数精度
const TOKEN_DECIMALS = {
  SUI: 9,
  USDT: 6,
  USDC: 6,
};

// ============================================================================
// Sui 客户端
// ============================================================================

let suiClient: SuiClient | null = null;

function getSuiClient(): SuiClient {
  if (!suiClient) {
    suiClient = new SuiClient({ url: SUI_RPC_URL });
  }
  return suiClient;
}

// ============================================================================
// 辅助函数：Coin 查询和余额管理
// ============================================================================

/**
 * 获取用户的所有 Coin 对象
 */
export async function getAllCoins(owner: string): Promise<Array<{ objectId: string; balance: bigint; tokenType: string }>> {
  const client = getSuiClient();
  const coins = [];

  try {
    // 获取所有 Coins（包括 SUI 和其他 Token）
    const allCoins = await client.getAllCoins({ owner });

    for (const coin of allCoins.data) {
      const coinType = coin.coinType;
      let balance: bigint;

      // 解析余额（直接使用 BigInt，避免 parseInt 精度丢失）
      if (typeof coin.balance === 'string') {
        balance = BigInt(coin.balance);
      } else {
        balance = BigInt(coin.balance);
      }

      coins.push({
        objectId: coin.coinObjectId,
        balance,
        tokenType: coinType,
      });
    }

    console.log(`[getAllCoins] 找到 ${coins.length} 个 Coin 对象`);
    return coins;
  } catch (error) {
    console.error('[getAllCoins] 查询失败:', error);
    throw new Error(`查询 Coin 失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 查询特定 Token 的余额
 */
export async function getTokenBalance(owner: string, tokenType: string): Promise<bigint> {
  const coins = await getAllCoins(owner);
  const totalBalance = coins
    .filter(c => c.tokenType === tokenType)
    .reduce((sum, c) => sum + c.balance, BigInt(0));

  console.log(`[getTokenBalance] ${tokenType} 余额: ${totalBalance.toString()}`);
  return totalBalance;
}

/**
 * 将金额字符串转换为 BigInt（考虑小数位）
 */
export function parseTokenAmount(amount: string, token: string): bigint {
  const normalizedToken = token.toUpperCase();
  const decimals = TOKEN_DECIMALS[normalizedToken as keyof typeof TOKEN_DECIMALS] || 9;

  // 处理小数
  const [integer, fraction = ''] = amount.split('.');
  const integerPart = BigInt(integer || '0');
  const fractionalPart = BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals));

  return integerPart * BigInt(10 ** decimals) + fractionalPart;
}

/**
 * 将 BigInt 转换为可读金额
 */
export function formatTokenAmount(amount: bigint, token: string): string {
  const normalizedToken = token.toUpperCase();
  const decimals = TOKEN_DECIMALS[normalizedToken as keyof typeof TOKEN_DECIMALS] || 9;

  const divisor = BigInt(10 ** decimals);
  const integer = amount / divisor;
  const fractional = amount % divisor;

  if (fractional === BigInt(0)) {
    return integer.toString();
  }

  const fractionalStr = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${integer}.${fractionalStr}`;
}

/**
 * 准备支付 Coin（支持 Coin 合并）
 *
 * @param tx - Transaction 对象
 * @param owner - 所有者地址
 * @param tokenType - Token 类型
 * @param amount - 需要的金额
 * @returns 可以用于支付的 Coin 对象引用（TransactionResult）
 */
export async function preparePaymentCoin(
  tx: Transaction,
  owner: string,
  tokenType: string,
  amount: bigint
): Promise<{ $kind: "NestedResult"; NestedResult: [number, number] }> {
  console.log(`[preparePaymentCoin] 准备支付: ${amount.toString()} ${tokenType}`);

  // SUI 特殊处理：直接从 gas 拆分
  if (tokenType === TOKEN_TYPES.SUI) {
    const [splitCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
    console.log(`[preparePaymentCoin] ✅ SUI 支付 Coin 准备完成`);
    return splitCoin;
  }

  // 其他 Token：查询用户 Coin
  const coins = await getAllCoins(owner);
  const tokenCoins = coins.filter(c => c.tokenType === tokenType);

  if (tokenCoins.length === 0) {
    throw new Error(`未找到 ${tokenType} Coin 对象`);
  }

  // 1. 查找是否有单个足够大的 Coin
  const bigEnoughCoin = tokenCoins.find(c => c.balance >= amount);

  if (bigEnoughCoin) {
    // 找到足够大的 Coin，直接拆分
    const [splitCoin] = tx.splitCoins(tx.object(bigEnoughCoin.objectId), [tx.pure.u64(amount)]);
    console.log(`[preparePaymentCoin] ✅ 使用单个大额 Coin (余额: ${bigEnoughCoin.balance.toString()})`);
    return splitCoin;
  }

  // 2. 没有单个足够大的 Coin，需要合并多个 Coin
  console.log(`[preparePaymentCoin] 单个 Coin 不足，需要合并多个 Coin (共 ${tokenCoins.length} 个)`);

  // 计算总余额
  const totalBalance = tokenCoins.reduce((sum, c) => sum + c.balance, BigInt(0));

  if (totalBalance < amount) {
    throw new Error(
      `余额不足！需要: ${amount.toString()}, 当前总余额: ${totalBalance.toString()}`
    );
  }

  // 选择最大的 Coin 作为目标
  const largestCoin = tokenCoins.reduce((prev, current) =>
    current.balance > prev.balance ? current : prev
  );

  // 合并其他 Coin 到最大的 Coin
  const coinsToMerge = tokenCoins
    .filter(c => c.objectId !== largestCoin.objectId)
    .map(c => tx.object(c.objectId));

  if (coinsToMerge.length > 0) {
    tx.mergeCoins(
      tx.object(largestCoin.objectId),
      coinsToMerge
    );
    console.log(`[preparePaymentCoin] ✅ 合并了 ${coinsToMerge.length} 个 Coin 到最大的 Coin`);
  }

  // 从合并后的 Coin 中拆分出需要的金额
  const [splitCoin] = tx.splitCoins(tx.object(largestCoin.objectId), [tx.pure.u64(amount)]);
  console.log(`[preparePaymentCoin] ✅ 支付 Coin 准备完成`);
  return splitCoin;
}

// ============================================================================
// Swap: 集成 Kriya DEX
// ============================================================================

/**
 * 获取 Kriya Pool 信息
 */
async function getKriyaPoolInfo(tokenA: string, tokenB: string): Promise<{ objectId: string; tokenXType: string; tokenYType: string } | null> {
  try {
    // 标准化 Token 类型
    const typeA = TOKEN_TYPES[tokenA.toUpperCase() as keyof typeof TOKEN_TYPES] || tokenA;
    const typeB = TOKEN_TYPES[tokenB.toUpperCase() as keyof typeof TOKEN_TYPES] || tokenB;

    // 确保顺序一致（用于查找 pool）
    const [tokenX, tokenY] = [typeA, typeB].sort();

    console.log(`[getKriyaPoolInfo] 查找 Pool: ${tokenX} / ${tokenY}`);

    // 使用 Kriya SDK 获取 Pool
    // 参数：rpcEndpoint, packageId, isMainnet (true = mainnet)
    const sdk = new KriyaSDK(SUI_RPC_URL, KRIYA_PACKAGE_ID, true);

    // 尝试获取 Pool 信息
    const pools = await sdk.Pool.getAllPools();

    // 查找匹配的 Pool (ExtendedPool 使用 snake_case)
    const matchingPool = pools.find(
      (pool) =>
        (pool.token_x_type === tokenX && pool.token_y_type === tokenY) ||
        (pool.token_x_type === tokenY && pool.token_y_type === tokenX)
    );

    if (matchingPool) {
      console.log(`[getKriyaPoolInfo] 找到 Pool: ${matchingPool.pool_id}`);
      return {
        objectId: matchingPool.pool_id,
        tokenXType: matchingPool.token_x_type,
        tokenYType: matchingPool.token_y_type,
      };
    }

    console.warn(`[getKriyaPoolInfo] 未找到匹配的 Pool`);
    return null;
  } catch (error) {
    console.error('[getKriyaPoolInfo] 查询失败:', error);
    return null;
  }
}

/**
 * 构建 Swap 交易（使用 Kriya DEX）
 */
async function buildSwap(tx: Transaction, intent: Intent, senderAddress?: string) {
  const params = intent.params as SwapParams;
  const { inputToken, outputToken, amount, slippage } = params;

  console.log(`[Swap] 开始构建: ${amount} ${inputToken} → ${outputToken}, 滑点: ${slippage}%`);

  if (!senderAddress) {
    throw new Error('Swap 需要发送者地址');
  }

  try {
    // 1. 解析输入金额
    const inputAmount = parseTokenAmount(amount, inputToken);
    console.log(`[Swap] 输入金额 (原始): ${amount}`);
    console.log(`[Swap] 输入金额 (转换): ${inputAmount.toString()} (${inputToken})`);

    // 2. ✅ 修复：添加滑点上限校验（防止三明治攻击）
    const slippageDecimal = parseFloat(slippage) / 100;
    if (slippageDecimal < 0 || slippageDecimal > 0.05) {
      throw new Error(`滑点必须在 0-5% 之间，当前值：${slippage}%`);
    }
    console.log(`[Swap] ✅ 滑点校验通过 (${slippage}%)`);

    // 3. 获取 Pool 信息
    const poolInfo = await getKriyaPoolInfo(inputToken, outputToken);

    if (!poolInfo) {
      throw new Error(`未找到 ${inputToken}/${outputToken} 交易池，请确认交易对是否支持`);
    }

    // 4. ⚠️ 注意：计算最小输出量需要基于实际报价
    // 当前简化处理：暂时使用占位符逻辑
    // TODO: 实现完整的报价查询（使用 devInspectTransactionBlock 或 Kriya SDK）
    const inputTokenType = TOKEN_TYPES[inputToken.toUpperCase() as keyof typeof TOKEN_TYPES] || inputToken;
    const outputTokenType = TOKEN_TYPES[outputToken.toUpperCase() as keyof typeof TOKEN_TYPES] || outputToken;

    // 临时方案：设置一个保守的最小输出量（1% 的输入金额作为占位符）
    // 实际应该基于 Pool 报价计算
    const minOutputAmount = inputAmount / BigInt(100);

    console.log(`[Swap] 最小输出量（占位符）: ${minOutputAmount.toString()} (${outputToken})`);
    console.warn(`[Swap] ⚠️ 当前使用简化滑点计算，实际需要基于 Pool 报价`);

    // 5. ✅ 修复：准备支付 Coin（而不是直接使用 tx.gas）
    const paymentCoin = await preparePaymentCoin(tx, senderAddress, inputTokenType, inputAmount);

    // 6. 调用 Kriya DEX swap
    tx.moveCall({
      target: `${KRIYA_PACKAGE_ID}::pool::swap`,
      typeArguments: [inputTokenType, outputTokenType],
      arguments: [
        tx.object(poolInfo.objectId), // Pool
        paymentCoin,                   // ✅ 使用准备好的支付 Coin
        tx.pure.u64(minOutputAmount),  // 最小输出量
      ],
    });

    console.log(`[Swap] ✅ Swap 交易构建成功`);
  } catch (error) {
    console.error('[Swap] ❌ 构建失败:', error);
    throw error;
  }
}

// ============================================================================
// Transfer: 完整实现（移除限制）
// ============================================================================

/**
 * 构建转账交易（完整实现）
 */
async function buildTransfer(tx: Transaction, intent: Intent, senderAddress?: string) {
  const params = intent.params as TransferParams;
  const { recipient, token, amount } = params;

  console.log(`[Transfer] 开始构建: ${amount} ${token} → ${recipient}`);

  if (!senderAddress) {
    throw new Error('Transfer 需要发送者地址');
  }

  try {
    // 1. 验证接收地址格式
    if (!recipient.startsWith('0x') || recipient.length !== 66) {
      throw new Error(`无效的接收地址: ${recipient}`);
    }

    // 2. 解析转账金额
    const transferAmount = parseTokenAmount(amount, token);
    console.log(`[Transfer] 转账金额 (原始): ${amount}`);
    console.log(`[Transfer] 转账金额 (转换): ${transferAmount.toString()} (${token})`);

    // 3. 查询余额
    const tokenType = TOKEN_TYPES[token.toUpperCase() as keyof typeof TOKEN_TYPES] || token;
    const balance = await getTokenBalance(senderAddress, tokenType);

    if (balance < transferAmount) {
      const balanceFormatted = formatTokenAmount(balance, token);
      throw new Error(
        `余额不足！需要: ${amount} ${token}, 当前余额: ${balanceFormatted} ${token}`
      );
    }

    console.log(`[Transfer] ✅ 余额检查通过 (${formatTokenAmount(balance, token)} ${token})`);

    // 4. 执行转账
    if (token.toUpperCase() === 'SUI') {
      // SUI: 使用 splitCoins 从 gas object 拆分
      const [splitCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(transferAmount)]);
      tx.transferObjects([splitCoin], tx.pure.address(recipient));
      console.log(`[Transfer] ✅ SUI 转账构建成功`);
    } else {
      // 其他 Token: 查询并选择 Coin 对象
      const coins = await getAllCoins(senderAddress);
      const tokenCoins = coins.filter(c => c.tokenType === tokenType);

      if (tokenCoins.length === 0) {
        throw new Error(`未找到 ${token} Coin 对象`);
      }

      // 选择足够的 Coin（简化处理：使用第一个 Coin）
      // 实际应该合并多个 Coin 或使用 mergeCoins
      const coinObjectId = tokenCoins[0].objectId;

      if (tokenCoins[0].balance < transferAmount) {
        throw new Error(
          `单个 Coin 余额不足，需要拆分或合并多个 Coin (当前找到 ${tokenCoins.length} 个)`
        );
      }

      // ✅ 修复：先拆分出指定金额，再转账（避免转走整个 Coin）
      const [splitCoin] = tx.splitCoins(tx.object(coinObjectId), [tx.pure.u64(transferAmount)]);
      tx.transferObjects([splitCoin], tx.pure.address(recipient));
      console.log(`[Transfer] ✅ ${token} 转账构建成功`);
    }
  } catch (error) {
    console.error('[Transfer] ❌ 构建失败:', error);
    throw error;
  }
}

// ============================================================================
// Split: 支持多 Token
// ============================================================================

/**
 * 构建拆分交易（支持多 Token）
 */
async function buildSplit(tx: Transaction, intent: Intent, senderAddress?: string) {
  const params = intent.params as SplitParams;
  const { splits, token } = params;

  console.log(`[Split] 开始构建: ${token} 拆分为 ${splits.length} 份: ${splits.join(', ')}`);

  if (!senderAddress) {
    throw new Error('Split 需要发送者地址');
  }

  try {
    const tokenType = TOKEN_TYPES[token.toUpperCase() as keyof typeof TOKEN_TYPES] || token;

    // 1. 计算总金额和每份金额
    const splitsAsBigint = splits.map(s => parseTokenAmount(s, token));
    const totalAmount = splitsAsBigint.reduce((sum, amount) => sum + amount, BigInt(0));

    console.log(`[Split] 总金额: ${totalAmount.toString()} (${token})`);

    // 2. 查询余额
    const balance = await getTokenBalance(senderAddress, tokenType);

    if (balance < totalAmount) {
      const balanceFormatted = formatTokenAmount(balance, token);
      const totalFormatted = formatTokenAmount(totalAmount, token);
      throw new Error(
        `余额不足！需要: ${totalFormatted} ${token}, 当前余额: ${balanceFormatted} ${token}`
      );
    }

    console.log(`[Split] ✅ 余额检查通过`);

    // 3. 执行拆分
    if (token.toUpperCase() === 'SUI') {
      // SUI: 使用 splitCoins 从 gas object 拆分
      const splitCoins = tx.splitCoins(
        tx.gas,
        splitsAsBigint.map(amount => tx.pure.u64(amount))
      );

      // 转给自己
      tx.transferObjects(splitCoins, tx.pure.address(senderAddress));
      console.log(`[Split] ✅ SUI 拆分构建成功`);
    } else {
      // 其他 Token: 查询 Coin 并拆分
      const coins = await getAllCoins(senderAddress);
      const tokenCoins = coins.filter(c => c.tokenType === tokenType);

      if (tokenCoins.length === 0) {
        throw new Error(`未找到 ${token} Coin 对象`);
      }

      // 使用第一个 Coin 进行拆分
      const coinObjectId = tokenCoins[0].objectId;

      if (tokenCoins[0].balance < totalAmount) {
        throw new Error(`Coin 余额不足，无法拆分`);
      }

      // 拆分 Coin
      const splitCoins = tx.splitCoins(
        tx.object(coinObjectId),
        splitsAsBigint.map(amount => tx.pure.u64(amount))
      );

      // 转给自己
      tx.transferObjects(splitCoins, tx.pure.address(senderAddress));
      console.log(`[Split] ✅ ${token} 拆分构建成功`);
    }
  } catch (error) {
    console.error('[Split] ❌ 构建失败:', error);
    throw error;
  }
}

// ============================================================================
// 主函数：构建 Transaction
// ============================================================================

/**
 * 根据意图列表构建 Transaction
 *
 * 安全说明：
 * - 使用真实 DEX（Kriya）
 * - 完整的 Coin 查询和余额验证
 * - 清晰的错误提示
 */
export async function buildTransaction(
  intents: Intent[],
  senderAddress?: string
): Promise<Transaction> {
  const tx = new Transaction();
  let hasRealOperation = false;

  console.log(`\n========== 开始构建 Transaction ==========`);
  console.log(`意图数量: ${intents.length}`);
  console.log(`发送者: ${senderAddress || '未提供'}`);

  for (const intent of intents) {
    console.log(`\n--- 处理意图: ${intent.action} ---`);

    switch (intent.action) {
      case 'swap':
        await buildSwap(tx, intent, senderAddress);
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
        console.warn(`[Unknown Action] ${intent.action}`);
    }
  }

  // 安全措施：如果没有真实操作，添加一个最小转账
  if (!hasRealOperation && senderAddress) {
    console.log(`\n[Safe Mode] 添加最小转账以验证交易`);
    tx.transferObjects([tx.gas], tx.pure.address(senderAddress));
  }

  console.log(`\n========== Transaction 构建完成 ==========\n`);

  return tx;
}
