/**
 * 授权对象管理
 *
 * 功能：
 * - 创建授权对象
 * - 保存/读取授权对象 ID（localStorage）
 * - 检查授权状态
 * - 使用授权执行交易
 */

import { SuiClient } from '@mysten/sui/client';
import { AUTH_PACKAGE_ID, AUTH_OBJECT_KEY, DEFAULT_AUTH_PARAMS } from './config';

// 授权对象信息
export interface AuthObjectInfo {
  objectId: string;
  owner: string;
  dailyLimit: string;
  perTxLimit: string;
  expiry: number;
  enabled: boolean;
  usedToday: string;
}

/**
 * 从 localStorage 读取授权对象 ID
 */
export function getSavedAuthObjectId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(AUTH_OBJECT_KEY);
  } catch {
    return null;
  }
}

/**
 * 保存授权对象 ID 到 localStorage
 */
export function saveAuthObjectId(objectId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(AUTH_OBJECT_KEY, objectId);
  } catch (e) {
    console.error('Failed to save auth object ID:', e);
  }
}

/**
 * 清除保存的授权对象 ID
 */
export function clearAuthObjectId(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(AUTH_OBJECT_KEY);
  } catch (e) {
    console.error('Failed to clear auth object ID:', e);
  }
}

/**
 * 查询授权对象状态
 */
export async function getAuthStatus(
  client: SuiClient,
  authObjectId: string
): Promise<AuthObjectInfo | null> {
  try {
    const result = await client.getObject({
      id: authObjectId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });

    if (!result.data?.content) {
      return null;
    }

    const content = result.data.content as any;
    const fields = content.fields;

    return {
      objectId: authObjectId,
      owner: fields.owner,
      dailyLimit: fields.daily_limit,
      perTxLimit: fields.per_tx_limit,
      expiry: fields.expiry,
      enabled: fields.enabled,
      usedToday: fields.used_today,
    };
  } catch (e) {
    console.error('Failed to get auth status:', e);
    return null;
  }
}

/**
 * 检查授权是否有效
 */
export function isAuthValid(auth: AuthObjectInfo): boolean {
  const now = Math.floor(Date.now() / 1000);

  return (
    auth.enabled &&
    auth.expiry > now
  );
}

/**
 * 检查授权额度是否足够
 */
export function hasEnoughQuota(
  auth: AuthObjectInfo,
  amount: string
): boolean {
  const dailyLimit = BigInt(auth.dailyLimit);
  const usedToday = BigInt(auth.usedToday);
  const requestedAmount = BigInt(amount);

  // 检查每日限额
  if (usedToday + requestedAmount > dailyLimit) {
    return false;
  }

  // 检查单笔限额
  const perTxLimit = BigInt(auth.perTxLimit);
  if (requestedAmount > perTxLimit) {
    return false;
  }

  return true;
}

/**
 * 格式化授权参数为交易参数
 */
export function formatAuthParams(params: {
  dailyLimit: number;
  perTxLimit: number;
  validityDays: number;
}) {
  return {
    dailyLimit: Math.floor(params.dailyLimit * 1e9),  // 转换为最小单位
    perTxLimit: Math.floor(params.perTxLimit * 1e9),
    validityDays: params.validityDays,
  };
}

/**
 * 从交易结果中提取授权对象 ID
 *
 * 注意：钱包扩展默认不返回 objectChanges
 * 需要通过 RPC 查询交易详情获取
 */
export async function extractAuthObjectId(
  result: any,
  client?: SuiClient,
  maxRetries: number = 5,
  retryDelay: number = 2000
): Promise<string | null> {
  // 1. 先尝试直接从结果中获取 objectChanges（某些钱包支持）
  if (result.objectChanges) {
    const authObject = result.objectChanges.find(
      (obj: any) =>
        obj.type === 'created' &&
        obj.objectType?.includes('Authorization')
    );

    if (authObject) {
      return authObject.objectId;
    }
  }

  // 2. 如果没有 objectChanges，通过 RPC 查询交易详情
  if (result.digest && client) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[extractAuthObjectId] 尝试查询交易详情 (${attempt}/${maxRetries})...`);

        const txDetails = await client.getTransactionBlock({
          digest: result.digest,
          options: {
            showObjectChanges: true,
          },
        });

        if (txDetails.objectChanges) {
          // 查找 created 类型的对象变更
          const authObject = Array.from(txDetails.objectChanges).find(
            (obj: any) =>
              obj.type === 'created' &&
              obj.objectType?.includes('Authorization')
          );

          if (authObject && 'objectId' in authObject) {
            console.log(`[extractAuthObjectId] ✅ 找到授权对象 ID: ${(authObject as any).objectId}`);
            return (authObject as any).objectId;
          }
        }

        console.log(`[extractAuthObjectId] 未找到授权对象，重试中...`);

      } catch (e: any) {
        console.error(`[extractAuthObjectId] 查询失败 (尝试 ${attempt}/${maxRetries}):`, e?.message || e);

        // 如果是最后一次尝试，不再等待
        if (attempt === maxRetries) {
          console.error('[extractAuthObjectId] 所有重试均失败');
          break;
        }
      }

      // 等待一段时间后重试
      if (attempt < maxRetries) {
        console.log(`[extractAuthObjectId] 等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // 3. 如果都找不到，返回 null
  console.error('[extractAuthObjectId] 未能提取授权对象 ID');
  return null;
}
