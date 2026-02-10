/**
 * Otter - 授权管理页面
 * 用户可以在此创建、管理和撤销授权
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Shield, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useWalletConnection } from '@/components/WalletButton';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { AUTH_PACKAGE_ID, DEFAULT_AUTH_PARAMS } from '@/lib/config';
import { saveAuthObjectId, clearAuthObjectId, extractAuthObjectId } from '@/lib/authorization';

type AuthorizationStatus = {
  enabled: boolean;
  daily_limit: number;
  per_tx_limit: number;
  used_today: number;
  last_reset: number;
  expiry: number;
};

export default function AuthorizePage() {
  const { isConnected, address, signAndExecuteTransaction } = useWalletConnection();

  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthorizationStatus | null>(null);
  const [authId, setAuthId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 创建 SuiClient（用于查询交易详情）
  const suiClient = new SuiClient({
    url: getFullnodeUrl('mainnet'),
  });

  // 创建授权表单
  const [formData, setFormData] = useState({
    tokenType: 'SUI',
    dailyLimit: DEFAULT_AUTH_PARAMS.dailyLimit.toString(),
    perTxLimit: DEFAULT_AUTH_PARAMS.perTxLimit.toString(),
    validityDays: DEFAULT_AUTH_PARAMS.validityDays.toString(),
  });

  // TODO: 从后端获取授权状态
  const fetchAuthStatus = async () => {
    if (!address) return;

    try {
      // 调用后端 API 查询授权状态
      const response = await fetch(`/api/auth-status?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data.status);
        setAuthId(data.authId);
      }
    } catch (err) {
      console.error('Failed to fetch auth status:', err);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchAuthStatus();
    }
  }, [isConnected, address]);

  // 创建授权
  const createAuthorization = async () => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 创建交易
      const tx = new Transaction();

      // 检查 AUTH_PACKAGE_ID 是否配置
      if (!AUTH_PACKAGE_ID) {
        setError('授权合约未部署，请联系管理员');
        setLoading(false);
        return;
      }

      // 调用 Move 合约创建授权
      tx.moveCall({
        target: `${AUTH_PACKAGE_ID}::auth::create_authorization`,
        arguments: [
          tx.pure.address(AUTH_PACKAGE_ID), // agent = 合约地址
          tx.pure.string(formData.tokenType),
          tx.pure.u64(Number(formData.dailyLimit) * 1e9), // 转换为最小单位
          tx.pure.u64(Number(formData.perTxLimit) * 1e9),
          tx.pure.u64(Number(formData.validityDays)),
        ],
      });

      // 签名并执行
      console.log('[Create Auth] 正在创建授权交易...');
      const result = await signAndExecuteTransaction({ transaction: tx });
      console.log('[Create Auth] 交易已提交:', result.digest);

      // 显示正在提取状态
      setSuccess('✅ 交易已提交！正在提取授权对象 ID，请稍候...\n\n（这可能需要几秒钟）');

      // 从交易结果中提取授权对象 ID（异步，带重试）
      console.log('[Create Auth] 开始提取授权对象 ID...');
      const authObjectId = await extractAuthObjectId(result, suiClient, 5, 2000);

      if (authObjectId) {
        // 保存到 localStorage
        saveAuthObjectId(authObjectId);
        setAuthId(authObjectId);

        setSuccess(`✅ 授权创建成功！\n\n授权对象 ID: ${authObjectId}\n有效期: ${formData.validityDays} 天\n每日限额: ${formData.dailyLimit} SUI\n单笔限额: ${formData.perTxLimit} SUI\n\n后续转账可直接使用授权，无需重复签名！\n\n💡 提示：3秒后自动跳转到主页面...`);

        // 3秒后自动跳转到主页面
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setError('授权交易已提交，但无法提取授权对象 ID。\n\n可能原因：\n1. 交易还未确认（请稍后刷新页面重试）\n2. 交易失败（请查看钱包交易记录）\n\n💡 你也可以手动复制交易 Digest 到 SuiScan 查看详情');
        console.error('Failed to extract auth object ID from result:', result);
      }

    } catch (err) {
      console.error('Create authorization error:', err);
      setError(err instanceof Error ? err.message : '创建授权失败');
    } finally {
      setLoading(false);
    }
  };

  // 撤销授权
  const revokeAuthorization = async () => {
    if (!authId) {
      setError('未找到授权对象');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tx = new Transaction();

      if (!AUTH_PACKAGE_ID) {
        setError('授权合约未配置');
        setLoading(false);
        return;
      }

      tx.moveCall({
        target: `${AUTH_PACKAGE_ID}::auth::revoke_authorization`,
        arguments: [
          tx.object(authId),
        ],
      });

      await signAndExecuteTransaction({ transaction: tx });

      setSuccess('✅ 授权已撤销');
      setAuthStatus(null);
      setAuthId(null);

      // 清除 localStorage
      clearAuthObjectId();

    } catch (err) {
      console.error('Revoke authorization error:', err);
      setError(err instanceof Error ? err.message : '撤销授权失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  // 计算剩余天数
  const getDaysRemaining = (expiry: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, expiry - now);
    return Math.ceil(remaining / (24 * 3600));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">
              授权管理
            </h1>
          </div>
          <p className="text-lg text-purple-200">
            授权 Intent Agent 在额度内免签执行交易
          </p>
        </div>

        {!isConnected && (
          <Card className="bg-yellow-900/20 border-yellow-500/20 p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <p className="text-yellow-200">
                请先连接钱包才能管理授权
              </p>
            </div>
          </Card>
        )}

        {isConnected && (
          <>
            {/* Error Display */}
            {error && (
              <div className="mb-8 p-4 bg-red-900/20 border border-red-500/20 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div className="mb-8 p-4 bg-green-900/20 border border-green-500/20 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-green-200 whitespace-pre-line">{success}</p>
              </div>
            )}

            {/* 当前授权状态 */}
            {authStatus ? (
              <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    当前授权状态
                  </h2>
                  <Button
                    onClick={revokeAuthorization}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        撤销授权
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">状态</div>
                    <div className={`text-lg font-semibold ${authStatus.enabled ? 'text-green-300' : 'text-red-300'}`}>
                      {authStatus.enabled ? '✅ 已启用' : '❌ 已禁用'}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">每日限额</div>
                    <div className="text-lg font-semibold text-white">
                      {(authStatus.daily_limit / 1e9).toFixed(0)} SUI
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">单笔限额</div>
                    <div className="text-lg font-semibold text-white">
                      {(authStatus.per_tx_limit / 1e9).toFixed(0)} SUI
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">今日已用</div>
                    <div className="text-lg font-semibold text-purple-300">
                      {(authStatus.used_today / 1e9).toFixed(2)} SUI
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">有效期</div>
                    <div className="text-lg font-semibold text-white">
                      {getDaysRemaining(authStatus.expiry)} 天
                    </div>
                  </div>

                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">过期时间</div>
                    <div className="text-sm text-slate-300">
                      {formatTimestamp(authStatus.expiry)}
                    </div>
                  </div>
                </div>

                {/* 使用进度条 */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">今日使用进度</span>
                    <span className="text-slate-300">
                      {((authStatus.used_today / authStatus.daily_limit) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (authStatus.used_today / authStatus.daily_limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            ) : (
              /* 创建授权表单 */
              <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-purple-400" />
                  创建新的授权
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      代币类型
                    </label>
                    <select
                      value={formData.tokenType}
                      onChange={(e) => setFormData({ ...formData, tokenType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="SUI">SUI</option>
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      每日限额（SUI）
                    </label>
                    <Input
                      type="number"
                      value={formData.dailyLimit}
                      onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                      placeholder="50"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">每天最多可以执行的交易总额</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      单笔限额（SUI）
                    </label>
                    <Input
                      type="number"
                      value={formData.perTxLimit}
                      onChange={(e) => setFormData({ ...formData, perTxLimit: e.target.value })}
                      placeholder="10"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">单笔交易最大金额</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      有效期（天）
                    </label>
                    <Input
                      type="number"
                      value={formData.validityDays}
                      onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                      placeholder="30"
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-500 mt-1">授权有效期，过期后需要重新创建</p>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={createAuthorization}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          创建中...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          创建授权
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* 说明文档 */}
            <Card className="bg-blue-900/20 border border-blue-500/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">📖 授权说明</h3>
              <div className="space-y-2 text-sm text-blue-200">
                <p>✅ <strong>授权后</strong>：Intent Agent 可以在额度内执行交易，无需每次确认</p>
                <p>✅ <strong>每日限额</strong>：限制每天的交易总额，自动在零点重置</p>
                <p>✅ <strong>单笔限额</strong>：限制单笔交易的最大金额</p>
                <p>✅ <strong>随时撤销</strong>：可以随时撤销授权，撤销后需要重新创建</p>
                <p>⚠️ <strong>安全提示</strong>：建议首次使用时设置较小的限额测试</p>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
