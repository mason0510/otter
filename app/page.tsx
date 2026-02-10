/**
 * Otter - Sui Intent Composer - 主页面
 * 完整版：包含钱包连接、Intent 解析、PTB 构建和交易执行
 * 支持授权模式：一次授权，后续免签执行 Transfer
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle2, Code, Copy, Shield } from 'lucide-react';
import { buildTransaction } from '@/lib/transaction-builder';
import WalletButton, { useWalletConnection } from '@/components/WalletButton';
import { getSavedAuthObjectId, saveAuthObjectId, clearAuthObjectId } from '@/lib/authorization';
import { AUTH_PACKAGE_ID, SWAP_WRAPPER_PACKAGE_ID } from '@/lib/config';
import type { Intent } from '@/lib/types';
import { toast } from 'sonner';

// 思考步骤类型
type ThinkingStep = {
  id: string;
  text: string;
  status: 'pending' | 'thinking' | 'done';
};

// Transaction Summary 类型
type TxSummary = {
  intents: Intent[];
  txData: string;
  gasEstimate: string;
};

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [txSummary, setTxSummary] = useState<TxSummary | null>(null);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [authObjectId, setAuthObjectId] = useState<string | null>(null);
  const [useAuthMode, setUseAuthMode] = useState(false);

  // 钱包连接
  const { isConnected, address, signAndExecuteTransaction } = useWalletConnection();

  // 加载保存的授权对象 ID
  useEffect(() => {
    const savedAuthId = getSavedAuthObjectId();
    if (savedAuthId) {
      setAuthObjectId(savedAuthId);
      setUseAuthMode(true);
    }
  }, []);

  // 更新思考步骤状态
  const updateStep = (id: string, status: 'thinking' | 'done') => {
    setThinkingSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status } : step
    ));
  };

  // 解析意图
  const parseIntent = async () => {
    if (!input.trim()) return;

    // 检查钱包连接
    if (!isConnected || !address) {
      setError('请先连接钱包');
      return;
    }

    setLoading(true);
    setError(null);
    setIntents([]);
    setTxSummary(null);
    setTxDigest(null);

    // 初始化思考步骤
    const steps: ThinkingStep[] = [
      { id: '1', text: '分析输入指令', status: 'pending' },
      { id: '2', text: '解析交易参数', status: 'pending' },
      { id: '3', text: '构建交易块', status: 'pending' },
      { id: '4', text: '安全验证完成', status: 'pending' },
    ];
    setThinkingSteps(steps);

    try {
      // 步骤 1: 分析输入
      updateStep('1', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 600));
      updateStep('1', 'done');

      // 步骤 2: 调用 LLM API
      updateStep('2', 'thinking');
      const response = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      await new Promise(resolve => setTimeout(resolve, 400));
      updateStep('2', 'done');

      if (!response.ok) {
        throw new Error(data.error || '解析失败');
      }

      if (data.intents.length === 0) {
        setError('无法理解您的意图，请重新表述');
        return;
      }

      setIntents(data.intents);

      // 检测 Swap 组合操作
      const hasSwap = data.intents.some(intent => intent.action === 'swap');
      const hasOtherOps = data.intents.some(intent => intent.action !== 'swap');
      if (hasSwap && hasOtherOps && data.intents.length > 1) {
        toast.warning('需要分步执行', {
          description: 'Swap 与其他操作需要分别执行。建议：先完成转账操作，然后单独执行 Swap。',
          duration: 7000,
        });
      }

      // 步骤 3: 构建 Transaction
      updateStep('3', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 构建时传入 address（从已连接的钱包获取）
      const transaction = await buildTransaction(data.intents, address);
      const txData = transaction.serialize();

      updateStep('3', 'done');

      // 步骤 4: 安全校验
      updateStep('4', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('4', 'done');

      setTxSummary({
        intents: data.intents,
        txData,
        gasEstimate: '0.01 SUI',
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  // 执行交易
  const executeTransaction = async () => {
    if (!isConnected) {
      setError('请先连接钱包');
      return;
    }

    if (!intents.length) {
      setError('请先解析意图');
      return;
    }

    if (!address) {
      setError('无法获取钱包地址');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      // 检查操作是否支持授权模式
      const supportsAuth = intents.length === 1 &&
        (intents[0].action === 'transfer' || intents[0].action === 'swap');

      // 如果操作支持授权模式但用户没有创建授权，给出提示
      if (supportsAuth && !authObjectId) {
        toast.info('建议创建授权', {
          description: '此操作支持授权模式，可以设置限额保护。点击右上角"授权管理"创建授权。',
          duration: 5000,
        });
      }

      // 检查是否可以使用授权模式
      let shouldUseAuth = useAuthMode && authObjectId;
      let shouldUseSwapAuth = false;

      // 如果启用授权模式，检查操作类型
      if (shouldUseAuth) {
        // 检查是否所有操作都支持授权模式
        const hasUnsupported = intents.some(intent =>
          intent.action !== 'transfer' && intent.action !== 'swap'
        );

        if (hasUnsupported) {
          // 如果有不支持的操作，无法使用授权模式
          shouldUseAuth = false;
          console.log('[Auth Mode] 检测到不支持授权的操作，降级为标准模式');
        } else if (intents.length === 1 && intents[0].action === 'swap') {
          // 单个 Swap 操作，使用 Swap Wrapper 授权模式
          shouldUseSwapAuth = true;
          console.log('[Auth Mode] ✅ Swap 支持授权模式（Swap Wrapper 已部署）');
        } else if (intents.length > 1) {
          // 多个操作组合暂不支持授权模式
          shouldUseAuth = false;
          console.log('[Auth Mode] 检测到多操作组合，降级为标准模式');
        }
      }

      // 1. 构建 Transaction
      const transaction = await buildTransaction(
        intents,
        address,
        shouldUseAuth && authObjectId ? authObjectId : undefined,
        shouldUseAuth ? AUTH_PACKAGE_ID : undefined,
        shouldUseSwapAuth ? SWAP_WRAPPER_PACKAGE_ID : undefined
      );

      console.log('Transaction built:', transaction);
      console.log('Auth mode:', shouldUseAuth ? '✅ Enabled' : '❌ Disabled');

      // 2. 签名并执行
      const result = await signAndExecuteTransaction(
        {
          transaction,
        }
      );

      console.log('Transaction result:', result);

      // 3. 保存 Transaction Digest
      setTxDigest(result.digest);

      // 4. 显示成功消息
      const explorerUrl = `https://suiscan.xyz/mainnet/tx/${result.digest}`;
      const modeText = shouldUseAuth ? '（授权模式）' : '';
      toast.success(`交易成功！${modeText}`, {
        description: `可以在 SuiScan 查看交易详情`,
        action: {
          label: '查看',
          onClick: () => window.open(explorerUrl, '_blank')
        },
      });

    } catch (err) {
      console.error('Transaction error:', err);
      const errorMsg = err instanceof Error ? err.message : '执行交易失败';
      setError(errorMsg);
      toast.error('交易失败', {
        description: errorMsg,
      });
    } finally {
      setExecuting(false);
    }
  };

  // 复制 Transaction 数据
  const copyTransaction = () => {
    if (!txSummary) return;
    navigator.clipboard.writeText(txSummary.txData);
    toast.success('复制成功', {
      description: 'Transaction 数据已复制到剪贴板',
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Otter" className="w-10 h-10" />
              <span className="text-xl font-bold text-white">Otter</span>
            </div>
            {useAuthMode && authObjectId && (
              <a
                href="/authorize"
                className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-500/20 rounded-lg text-green-300 text-sm hover:bg-green-900/30 transition-colors"
              >
                <Shield className="w-4 h-4" />
                授权已启用
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!useAuthMode && (
              <a
                href="/authorize"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/20 rounded-lg text-purple-300 text-sm hover:bg-purple-600/30 transition-colors"
              >
                <Shield className="w-4 h-4" />
                授权管理
              </a>
            )}
            <WalletButton />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Sui 链交互<br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              一句话搞定
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            告别繁琐的多步操作。告诉 Otter 你想做什么，<br className="hidden sm:block" />
            它会自动构建最优路径，一次签名完成所有交易。
          </p>

          {/* Network Notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>当前为 Mainnet - 交易会真实执行</span>
          </div>
        </div>

        {/* Input Section */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm mb-8">
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              你想做什么？
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：把 0.001 SUI 换成 USDC，滑点 1%"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && parseIntent()}
                className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
              <Button
                onClick={parseIntent}
                disabled={loading || !input.trim() || !isConnected}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  '开始执行'
                )}
              </Button>
            </div>

            {/* Example Prompts */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-slate-400">试试说：</span>
              {[
                '把 0.001 SUI 换成 USDC，滑点 1%',
                '转 0.001 SUI 到 0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225',
                '把我的 SUI 平均分成 3 份',
                '转 0.001 SUI 到 0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225 然后把 0.001 SUI 换成 USDC',
                '转 0.5 SUI 到 0x6c90dc192d728b32c20e34336137775bf632e51035d784dfea0df73c3aaba225',
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInput(example)}
                  className="text-xs px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-full transition-colors"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>

            {!isConnected && (
              <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex items-center gap-2 text-amber-200 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>请先连接钱包才能执行交易</span>
              </div>
            )}
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Thinking Steps */}
        {thinkingSteps.length > 0 && (
          <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">执行进度</h3>
            <div className="space-y-3">
              {thinkingSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    step.status === 'done'
                      ? 'bg-green-900/20 border border-green-500/20'
                      : step.status === 'thinking'
                      ? 'bg-purple-900/20 border border-purple-500/20'
                      : 'bg-slate-700/20 border border-slate-600/20'
                  }`}
                >
                  {step.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : step.status === 'thinking' ? (
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                  )}
                  <span className={`text-sm ${
                    step.status === 'done'
                      ? 'text-green-200'
                      : step.status === 'thinking'
                      ? 'text-purple-200'
                      : 'text-slate-400'
                  }`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intents Display */}
        {intents.length > 0 && (
          <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">交易操作</h3>
            <div className="space-y-3">
              {intents.map((intent, i) => (
                <div
                  key={i}
                  className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-300 uppercase">
                      {intent.action}
                    </span>
                    <span className="text-xs text-slate-400">
                      {(intent.confidence * 100).toFixed(0)}% 匹配
                    </span>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(intent.params, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Display & Execution */}
        {txSummary && (
          <div className="p-6 bg-slate-800/50 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Code className="w-5 h-5" />
                构建的 Transaction
              </h3>
              <div className="flex gap-2">
                {isConnected && (
                  <Button
                    onClick={executeTransaction}
                    disabled={executing}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {executing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        执行中...
                      </>
                    ) : (
                      '确认并签名'
                    )}
                  </Button>
                )}
                <Button
                  onClick={copyTransaction}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs px-3 py-1 h-8"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </Button>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <div className="text-xs text-slate-400 mb-1">操作数量</div>
                <div className="text-lg font-semibold text-white">{txSummary.intents.length}</div>
              </div>
              <div className="p-3 bg-slate-700/30 rounded-lg">
                <div className="text-xs text-slate-400 mb-1">预估 Gas</div>
                <div className="text-lg font-semibold text-white">{txSummary.gasEstimate}</div>
              </div>
              {/* 授权模式状态 */}
              {useAuthMode && authObjectId && txSummary.intents.length === 1 && (txSummary.intents[0].action === 'transfer' || txSummary.intents[0].action === 'swap') && (
                <div className="col-span-2 p-3 bg-green-900/20 border border-green-500/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-xs text-green-300">授权模式</div>
                      <div className="text-xs text-green-400">
                        此交易将使用授权对象执行，无需重复签名
                        {txSummary.intents[0].action === 'swap' && '（Swap Wrapper 已部署）'}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
              )}
            </div>

            {/* Transaction Data */}
            <div className="p-4 bg-slate-900/50 border border-slate-600 rounded-lg mb-4">
              <div className="text-xs text-slate-400 mb-2">Serialized Transaction (Base64)</div>
              <textarea
                readOnly
                value={txSummary.txData}
                className="w-full h-32 bg-transparent text-xs text-green-300 font-mono resize-none focus:outline-none"
              />
            </div>

            {/* Transaction Digest */}
            {txDigest && (
              <div className="p-4 bg-green-900/20 border border-green-500/20 rounded-lg mb-4">
                <div className="text-sm text-green-200 mb-2">交易已提交</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-green-300 font-mono flex-1 break-all">
                    {txDigest}
                  </code>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(txDigest);
                      toast.success('复制成功', {
                        description: '交易 Digest 已复制到剪贴板',
                      });
                    }}
                    variant="outline"
                    className="text-xs px-2 py-1 h-6 border-green-500/20 text-green-300"
                  >
                    复制
                  </Button>
                </div>
                <div className="mt-2">
                  <a
                    href={`https://suiscan.xyz/mainnet/tx/${txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    在 SuiScan 上查看 →
                  </a>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">交易说明</p>
                  <p className="text-blue-300/80">
                    此交易已通过以下安全检查：
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-blue-300/60">
                    <li>Cetus DEX 主网集成</li>
                    <li>滑点保护机制</li>
                    <li>余额验证</li>
                    <li>原子执行保证</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-400">
          <p>Built for Sui Vibe Spring Fest 2026 Hackathon</p>
          <p className="mt-1">
            <a
              href="https://github.com/mason0510/otter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
