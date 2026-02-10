'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  useConnectWallet,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useCurrentAccount,
  useWallets,
  useDisconnectWallet,
} from '@mysten/dapp-kit';
import { Wallet as WalletIcon, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleConnect = async (wallet: any) => {
    setShowDropdown(false);
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

  // 显示连接按钮（带下拉菜单）
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        <WalletIcon className="w-4 h-4 mr-2" />
        连接钱包
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </Button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 text-xs text-slate-400 uppercase tracking-wider">
              选择钱包
            </div>
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
              >
                <WalletIcon className="w-5 h-5 text-purple-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{wallet.name}</div>
                </div>
              </button>
            ))}
          </div>

          {/* 安装提示 */}
          <div className="border-t border-slate-700 p-3">
            <div className="text-xs text-slate-400 mb-2">没有看到您的钱包？</div>
            <div className="space-y-1 text-xs">
              <a
                href="https://chrome.google.com/webstore/detail/sui-wallet/opfgpfmcjgmiegjcamdmnilgdhekecah"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                <span>安装 Sui Wallet</span>
              </a>
              <a
                href="https://chromewebstore.google.com/detail/sui-backpack/nkkcbegkaiackbeklogakcpfnnglfmdh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                <span>安装 Sui Backpack</span>
              </a>
              <a
                href="https://phantom.app/ul/v1/connect"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                <span>安装 Phantom</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute right-0 mt-2 w-56 p-3 bg-red-900/90 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
