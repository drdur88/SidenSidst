import type { Metadata } from "next";
import "./news.css";

export const metadata: Metadata = {
  title: "Siden sidst — Nyheder, der husker for dig.",
  description: "Følg de sager, der betyder noget for dig. Siden sidst samler historien, følger udviklingen og viser, hvad der har ændret sig siden sidst.",
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
