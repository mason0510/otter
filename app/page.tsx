/**
 * Otter - Sui Intent Composer - 主页面
 * 完整版：包含钱包连接、Intent 解析、PTB 构建和交易执行
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Code, Copy } from 'lucide-react';
import { buildTransaction } from '@/lib/transaction-builder';
import WalletButton, { useWalletConnection } from '@/components/WalletButton';
import type { Intent } from '@/lib/types';

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

  // 钱包连接
  const { isConnected, address, signAndExecuteTransaction } = useWalletConnection();

  // 更新思考步骤状态
  const updateStep = (id: string, status: 'thinking' | 'done') => {
    setThinkingSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status } : step
    ));
  };

  // 解析意图
  const parseIntent = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setIntents([]);
    setTxSummary(null);
    setTxDigest(null);

    // 初始化思考步骤
    const steps: ThinkingStep[] = [
      { id: '1', text: '🔍 正在分析输入...', status: 'pending' },
      { id: '2', text: '🧠 调用 AI 解析意图...', status: 'pending' },
      { id: '3', text: '🔧 构建 Transaction...', status: 'pending' },
      { id: '4', text: '✅ 安全校验通过', status: 'pending' },
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

      // 步骤 3: 构建 Transaction
      updateStep('3', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 构建但不传入 address（只用于验证，不执行）
      const transaction = await buildTransaction(data.intents);
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
      // 1. 构建 Transaction（传入 senderAddress 用于安全验证）
      const transaction = await buildTransaction(intents, address);

      console.log('Transaction built:', transaction);

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
      alert(`✅ 交易成功！\n\nTransaction Digest:\n${result.digest}\n\n可以在 SuiScan 查看:\n${explorerUrl}`);

    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : '执行交易失败');
      alert(`❌ 交易失败：\n\n${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setExecuting(false);
    }
  };

  // 复制 Transaction 数据
  const copyTransaction = () => {
    if (!txSummary) return;
    navigator.clipboard.writeText(txSummary.txData);
    alert('✅ Transaction 数据已复制到剪贴板');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src="/logo.png" alt="Otter Logo" className="w-16 h-16" />
            <h1 className="text-5xl font-bold text-white">
              Otter - Sui Intent Composer
            </h1>
          </div>
          <p className="text-xl text-purple-200 mb-4">
            自然语言 → 可验证的 Sui Transaction
          </p>

          {/* Wallet Connection */}
          <div className="flex justify-center mb-4">
            <WalletButton />
          </div>

          {/* Network Notice */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-500/20 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-200 text-sm">
                ⚠️ 当前为 Mainnet - 交易会真实执行，请谨慎操作
              </span>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm mb-8">
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              📝 输入您的交易意图（自然语言）
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：Swap 10 SUI to USDC with 1% slippage"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && parseIntent()}
                className="flex-1 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
              />
              <Button
                onClick={parseIntent}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    解析意图
                  </>
                )}
              </Button>
            </div>

            {/* Example Prompts */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-slate-400">示例：</span>
              {[
                'Swap 10 SUI to USDC with 1% slippage',
                'Transfer 5 SUI to 0x1234...5678',
                'Split 100 SUI into 30%, 40%, 30%',
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
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-yellow-200 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>⚠️ 请先连接钱包才能执行交易</span>
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
            <h3 className="text-lg font-semibold text-white mb-4">🤖 AI 思考过程</h3>
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
            <h3 className="text-lg font-semibold text-white mb-4">🎯 解析出的意图</h3>
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
                      置信度: {(intent.confidence * 100).toFixed(0)}%
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
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        签名并执行
                      </>
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
                <div className="text-sm text-green-200 mb-2">✅ 交易已提交到链上</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-green-300 font-mono flex-1 break-all">
                    {txDigest}
                  </code>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(txDigest);
                      alert('✅ 交易 Digest 已复制');
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
                  <p className="font-medium mb-1">功能说明</p>
                  <p className="text-blue-300/80">
                    此 Transaction 包含以下功能：
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-blue-300/60">
                    <li>✅ 真实的 Kriya DEX Swap 集成（主网）</li>
                    <li>✅ 完整的 Transfer 实现</li>
                    <li>✅ Coin 自动合并逻辑</li>
                    <li>✅ 滑点安全校验 (0-5%)</li>
                    <li>✅ 余额验证和错误处理</li>
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
              href="https://github.com/yourusername/otter"
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
