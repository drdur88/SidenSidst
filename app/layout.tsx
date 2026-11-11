import type { Metadata } from "next";
import "./news.css";

export const metadata: Metadata = {
  title: "Siden sidst — Dit udsyn. Dit tempo.",
  description: "Et personligt nyhedsoverblik fra din by til resten af verden. Vælg emner, steder og kilder, og gem artikler til senere.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
