/**
 * 部署 Move 合约页面
 * 使用 Sui Wallet 直接部署到链上
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Shield, AlertTriangle, CheckCircle2, Code } from 'lucide-react';
import { useWalletConnection } from '@/components/WalletButton';
import { Transaction } from '@mysten/sui/transactions';
import { AUTH_PACKAGE_ID } from '@/lib/config';

// Move 合约源码（简化版，用于预览）
const MOVE_SOURCE = `
/// Otter Intent Agent Authorization Module
module authorization::auth {
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::transfer;
    use sui::object::UID;
    use sui::clock::Clock;
    use std::string::String;
    use sui::event;

    struct Authorization has key {
        id: UID,
        owner: address,
        agent: address,
        token_type: String,
        daily_limit: u64,
        per_tx_limit: u64,
        used_today: u64,
        last_reset: u64,
        expiry: u64,
        enabled: bool,
    }

    public entry fun create_authorization(...) { ... }
    public entry fun execute_with_auth(...) { ... }
    public entry fun revoke_authorization(...) { ... }
}
`;

export default function DeployPage() {
  const { isConnected, address, signAndExecuteTransaction } = useWalletConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);

  const deployContract = async () => {
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 注意：这里需要先使用 sui move build 编译出字节码
      // 然后将字节码作为参数传入

      // 临时方案：提示用户使用 CLI 部署
      setError('需要先编译合约字节码。请使用 sui CLI 部署，详见下方说明。');

    } catch (err) {
      console.error('Deploy error:', err);
      setError(err instanceof Error ? err.message : '部署失败');
    } finally {
      setLoading(false);
    }
  };

  const copyEnvConfig = () => {
    const envConfig = `NEXT_PUBLIC_AUTH_PACKAGE_ID=${packageId || '<PACKAGE_ID>'}`;
    navigator.clipboard.writeText(envConfig);
    alert('✅ 环境变量配置已复制到剪贴板');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">
              部署授权合约
            </h1>
          </div>
          <p className="text-lg text-purple-200">
            将 Move 合约部署到 Sui Mainnet
          </p>
        </div>

        {!isConnected && (
          <Card className="bg-yellow-900/20 border-yellow-500/20 p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <p className="text-yellow-200">
                请先连接 Sui Wallet
              </p>
            </div>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-200 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-8 p-4 bg-green-900/20 border border-green-500/20 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-green-200 whitespace-pre-line">{success}</p>
          </div>
        )}

        {/* Instructions */}
        <Card className="bg-slate-800/50 border-slate-700 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="w-6 h-6 text-purple-400" />
            部署说明
          </h2>

          <div className="space-y-4 text-sm text-slate-300">
            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="font-semibold text-white mb-2">方法 1: 使用 Sui CLI（推荐）</p>
              <pre className="text-xs text-green-300 overflow-x-auto">
{`# 1. 更新 Sui CLI 到最新版本
sui install

# 2. 进入项目目录
cd ~/code/06-production-business-money-live/sui-intent-agent/move/sources/authorization

# 3. 编译并部署
sui client publish --gas-budget 100000000

# 4. 复制返回的 Package ID`}
              </pre>
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
              <p className="font-semibold text-blue-200 mb-2">⚠️ 注意事项</p>
              <ul className="space-y-1 text-xs text-blue-300">
                <li>• 确保钱包有至少 0.1 SUI 用于部署</li>
                <li>• 部署需要约 1-2 分钟，请耐心等待</li>
                <li>• 部署成功后会返回 Package ID，请妥善保存</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-lg">
              <p className="font-semibold text-white mb-2">合约源码预览</p>
              <pre className="text-xs text-slate-400 overflow-x-auto max-h-64">
                {MOVE_SOURCE}
              </pre>
            </div>
          </div>
        </Card>

        {/* Package ID Input */}
        {packageId && (
          <Card className="bg-green-900/20 border border-green-500/20 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">
              ✅ 部署成功！Package ID: {packageId}
            </h3>
            <p className="text-sm text-green-200 mb-4">
              请将以下环境变量添加到 .env.local 和生产服务器：
            </p>
            <div className="p-3 bg-slate-900/50 rounded-lg mb-4">
              <code className="text-sm text-green-300">
                NEXT_PUBLIC_AUTH_PACKAGE_ID={packageId}
              </code>
            </div>
            <Button
              onClick={copyEnvConfig}
              className="bg-purple-600 hover:bg-purple-700"
            >
              复制环境变量配置
            </Button>
          </Card>
        )}

        {/* Contract Features */}
        <Card className="bg-blue-900/20 border border-blue-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">📋 合约功能</h3>
          <ul className="space-y-2 text-sm text-blue-200">
            <li>✅ <code>create_authorization</code> - 创建授权对象</li>
            <li>✅ <code>execute_with_auth</code> - 使用授权执行转账</li>
            <li>✅ <code>revoke_authorization</code> - 撤销授权</li>
            <li>✅ <code>disable_authorization</code> - 禁用授权</li>
            <li>✅ <code>enable_authorization</code> - 重新启用授权</li>
            <li>✅ <code>increase_daily_limit</code> - 增加每日限额</li>
            <li>✅ <code>get_auth_status</code> - 查询授权状态</li>
            <li>✅ <code>can_execute</code> - 检查是否可执行</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
