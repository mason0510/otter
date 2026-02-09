'use client';

import React from 'react';

// 简化版 Providers（移除钱包连接功能，专注于 Intent 解析和交易构建）
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
