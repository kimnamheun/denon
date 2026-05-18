import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { AppHeader } from "@/components/app-header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "치과 임플란트 중계 플랫폼",
  description: "환자와 치과를 연결하는 임플란트 견적 비교 플랫폼",
};

const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          <AppHeader />
          {children}
        </Providers>
        {NAVER_MAP_CLIENT_ID && (
          <Script
            strategy="afterInteractive"
            src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}&submodules=geocoder`}
          />
        )}
      </body>
    </html>
  );
}
