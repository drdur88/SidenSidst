import type { Metadata } from "next";
import "./news.css";

export const metadata: Metadata = {
  title: "Siden sidst — Bliv klogere. Ikke hængende.",
  description: "Hele historien. Fra A til Z. På din tid. Følg sagerne, forstå de væsentlige ændringer, og kom videre med din dag. Nyheder med hukommelse og opfølgning.",
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
