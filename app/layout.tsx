import type { Metadata } from "next";
import "./globals.css";
import '@mysten/dapp-kit/dist/index.css';
import { Providers } from '@/components/Providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "Otter - Sui Intent Composer",
  description: "自然语言生成可验证的 Sui PTB（Programmable Transaction Blocks）",
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-center" richColors duration={3000} />
      </body>
    </html>
  );
}
