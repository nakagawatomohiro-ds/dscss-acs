import type { Metadata } from "next";
import "./globals.css";
import Providers from "./components/Providers";

export const metadata: Metadata = {
  title: "DSCSS-ACS | AIクラウドセキュリティ学習",
  description:
    "DropStone AI Cloud Security Study — AIとクラウドセキュリティの知識を段階的に学べるプラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
