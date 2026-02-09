'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  useConnectWallet,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useCurrentAccount,
  useWallets,
  useDisconnectWallet,
} from '@mysten/dapp-kit';
import { Wallet as WalletIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function useWalletConnection() {
  const { mutate: connectWallet, isPending } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const address = currentAccount?.address;
  const isConnected = connectionStatus === 'connected';

  return {
    connectWallet,
    disconnectWallet,
    currentWallet,
    isConnected,
    address,
    isPending,
    signAndExecuteTransaction,
  };
}

export default function WalletButton() {
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const {
    connectWallet,
    disconnectWallet,
    isConnected,
    address,
    isPending,
  } = useWalletConnection();

  const wallets = useWallets();

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (wallet: any) => {
    setError(null);
    try {
      connectWallet({
        wallet,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接钱包失败');
      console.error('Wallet connection error:', err);
    }
  };

  // 避免 hydration 不匹配 - 未挂载时显示占位符
  if (!mounted) {
    return (
      <div className="h-10 w-40 bg-slate-800/50 rounded-lg animate-pulse" />
    );
  }

  // 如果已连接，显示地址和断开按钮
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-300 text-sm font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button
          onClick={() => disconnectWallet()}
          variant="outline"
          className="text-xs px-3 py-1 h-8 border-red-500/20 text-red-400 hover:bg-red-900/20 hover:text-red-300"
        >
          断开连接
        </Button>
      </div>
    );
  }

  // 如果正在连接，显示加载
  if (isPending) {
    return (
      <Button disabled className="bg-purple-600 hover:bg-purple-700">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        连接中...
      </Button>
    );
  }

  // 没有检测到钱包
  if (wallets.length === 0) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>请先安装 Sui Wallet 扩展</span>
      </div>
    );
  }

  // 显示连接按钮
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {wallets.map((wallet) => (
          <Button
            key={wallet.name}
            onClick={() => handleConnect(wallet)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <WalletIcon className="w-4 h-4 mr-2" />
            连接 {wallet.name}
          </Button>
        ))}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
