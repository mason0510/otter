/**
 * Sui Intent Agent - 主页面
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { buildPTB } from '@/lib/ptb-builder';
import type { Intent, PTBSummary } from '@/lib/types';
import WalletButton, { useWalletConnection } from '@/components/WalletButton';

// 思考步骤类型
type ThinkingStep = {
  id: string;
  text: string;
  status: 'pending' | 'thinking' | 'done';
};

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [summary, setSummary] = useState<PTBSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

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
    setSummary(null);

    // 初始化思考步骤
    const steps: ThinkingStep[] = [
      { id: '1', text: '🔍 正在分析输入...', status: 'pending' },
      { id: '2', text: '🧠 调用 AI 解析意图...', status: 'pending' },
      { id: '3', text: '🔧 构建 PTB...', status: 'pending' },
      { id: '4', text: '✅ 策略校验通过', status: 'pending' },
      { id: '5', text: '📊 生成交易摘要...', status: 'pending' },
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

      // 步骤 3: 构建 PTB
      updateStep('3', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = await buildPTB(data.intents);
      updateStep('3', 'done');

      // 步骤 4: 策略校验
      updateStep('4', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 300));

      if (result.error) {
        setError(result.error);
        return;
      }
      updateStep('4', 'done');

      // 步骤 5: 生成摘要
      updateStep('5', 'thinking');
      await new Promise(resolve => setTimeout(resolve, 300));
      setSummary(result.summary);
      updateStep('5', 'done');

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

    if (!summary) {
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
      const { buildTransaction } = await import('@/lib/transaction-builder');
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

      // 4. 显示成功消息（根据钱包网络选择 Explorer）
      const explorerUrl = `https://suiscan.xyz/mainnet/tx/${result.digest}`;
      alert(`✅ 交易成功！\n\nTransaction Digest:\n${result.digest}\n\n可以在 Sui Explorer 查看:\n${explorerUrl}`);

    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : '执行交易失败');
      alert(`❌ 交易失败：\n\n${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Sui Intent Agent
          </h1>
          <p className="text-xl text-purple-200">
            自然语言 → 可验证的 PTB（Programmable Transaction Blocks）
          </p>

          {/* Wallet Connection */}
          <div className="flex justify-center mt-6 mb-6">
            <WalletButton />
          </div>

          {/* Network Notice */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-500/20 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-200 text-sm">
                ⚠️ 当前为 Demo 模式 - 交易会真实执行，但只消耗少量 Gas
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2 bg-purple-800/50 px-4 py-2 rounded-full">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <span className="text-purple-100 text-sm">AI + Sui PTB</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-800/50 px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-blue-300" />
              <span className="text-blue-100 text-sm">Verified + Safe</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <Card className="p-6 bg-slate-800/50 border-purple-500/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              自然语言输入
            </h2>

            <div className="space-y-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：把 10 SUI 换成 USDT，滑点 3%，然后转一半给 Alice"
                className="w-full h-32 px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <Button
                onClick={parseIntent}
                disabled={loading || !input.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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

              {/* Examples */}
              <div className="mt-6">
                <p className="text-sm text-slate-400 mb-2">试试这些：</p>
                <div className="space-y-2">
                  {[
                    '把 10 SUI 换成 USDT，滑点 3%',
                    '把我的 SUI 平均分成 3 份',
                    '转 5 SUI 给 0x1234...',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setInput(example)}
                      className="block w-full text-left px-3 py-2 bg-slate-900/30 hover:bg-slate-900/50 rounded text-sm text-purple-300 transition"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Summary */}
          <Card className="p-6 bg-slate-800/50 border-purple-500/20">
            <h2 className="text-2xl font-semibold text-white mb-4">
              交易摘要
            </h2>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-500/20 rounded-lg mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-red-300 font-semibold">解析失败</p>
                  <p className="text-red-200 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Thinking Steps */}
            {loading && thinkingSteps.length > 0 && (
              <div className="space-y-2">
                {thinkingSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      step.status === 'done'
                        ? 'bg-green-900/20 border border-green-500/20'
                        : step.status === 'thinking'
                        ? 'bg-purple-900/30 border border-purple-500/30'
                        : 'bg-slate-900/30 border border-slate-700/30'
                    }`}
                  >
                    {step.status === 'thinking' && (
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    )}
                    {step.status === 'done' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {step.status === 'pending' && (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                    )}
                    <span
                      className={`text-sm ${
                        step.status === 'done'
                          ? 'text-green-300'
                          : step.status === 'thinking'
                          ? 'text-purple-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {summary && (
              <div className="space-y-4">
                {/* Actions List */}
                <div className="space-y-3">
                  {summary.actions.map((action, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-900/30 border border-purple-500/10 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <span className="text-white font-semibold capitalize">
                          {action.type}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{action.description}</p>
                      <div className="mt-2 space-y-1">
                        {Object.entries(action.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-400">{key}:</span>
                            <span className="text-slate-200">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Steps */}
                <div className="flex items-center justify-between p-4 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                  <span className="text-slate-300">总步骤数</span>
                  <span className="text-white font-bold">{summary.totalSteps}</span>
                </div>

                {/* Estimated Gas */}
                <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                  <span className="text-slate-300">预计 Gas</span>
                  <span className="text-white font-bold">{summary.estimatedGas} SUI</span>
                </div>

                {/* Risks */}
                {summary.risks.length > 0 && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
                    <p className="text-yellow-300 font-semibold mb-2">⚠️ 风险提示</p>
                    <ul className="space-y-1">
                      {summary.risks.map((risk, index) => (
                        <li key={index} className="text-yellow-200 text-sm">
                          • {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Execute Button */}
                {!isConnected ? (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-500/20 rounded-lg text-center">
                    <p className="text-yellow-300 font-semibold mb-2">🔒 需要连接钱包</p>
                    <p className="text-yellow-200 text-sm">请先在上方连接 Sui Wallet</p>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={executeTransaction}
                      disabled={executing}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 text-lg"
                    >
                      {executing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          执行中...
                        </>
                      ) : (
                        '✨ 一键签名并执行'
                      )}
                    </Button>

                    <p className="text-center text-slate-400 text-sm">
                      签名后，以上操作将原子执行（要么全部成功，要么全部失败）
                    </p>
                  </>
                )}

                {txDigest && (
                  <div className="p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                    <p className="text-green-300 font-semibold mb-2">✅ 交易成功</p>
                    <p className="text-green-200 text-sm font-mono break-all">
                      Digest: {txDigest}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!summary && !error && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                <p>输入你的意图，AI 将为你生成可验证的 PTB</p>
              </div>
            )}
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>🚀 Sui Vibe 黑客松项目 | AI + Infra 赛道</p>
          <p className="mt-2">
            Built with ❤️ using Next.js, Sui SDK, and DeepSeek
          </p>
        </div>
      </div>
    </main>
  );
}
