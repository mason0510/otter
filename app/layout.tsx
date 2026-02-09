import type { Metadata } from "next";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: "Sui Intent Agent - Verified PTB Composer",
  description: "自然语言生成可验证的 Sui PTB（Programmable Transaction Blocks）",
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
      </body>
    </html>
  );
}
