'use client';

import React from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 配置 Sui 网络（支持 testnet 和 mainnet）
const { networkConfig } = createNetworkConfig({
  testnet: {
    url: 'https://fullnode.testnet.sui.io:443',
    network: 'testnet'
  },
  mainnet: {
    url: 'https://fullnode.mainnet.sui.io:443',
    network: 'mainnet'
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  // 确保 QueryClient 在客户端只创建一次
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect={true}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

// 导出网络配置，供其他组件使用
export { networkConfig };
