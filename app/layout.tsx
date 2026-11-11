import type { Metadata } from "next";
import "./news.css";

export const metadata: Metadata = {
  title: "Siden sidst — Nyheder, der husker og følger op",
  description: "Følg de sager, du går op i. Vi husker, hvad du har fået at vide, viser hvad der har ændret sig og følger de åbne spørgsmål videre.",
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
