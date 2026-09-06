import type { Metadata } from "next";
import "./globals.css";
import { PROJECT } from "@/config/project";

const ogImage = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "TipMeBitcoin — Non-custodial BCH tipping identity",
  type: "image/png" as const,
};

export const metadata: Metadata = {
  title: {
    default: `${PROJECT.name} — BCH Tipping Identity`,
    template: `%s · ${PROJECT.name}`,
  },
  description: PROJECT.description,
  metadataBase: new URL(PROJECT.appUrl),
  applicationName: PROJECT.name,
  keywords: [
    "Bitcoin Cash",
    "BCH",
    "CashTokens",
    "tipping",
    "non-custodial",
    "TipMeBitcoin",
  ],
  authors: [{ name: PROJECT.name }],
  openGraph: {
    title: `${PROJECT.name} — BCH Tipping Identity`,
    description: PROJECT.description,
    url: PROJECT.appUrl,
    siteName: PROJECT.name,
    locale: "en_US",
    type: "website",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROJECT.name} — BCH Tipping Identity`,
    description: PROJECT.description,
    images: [ogImage.url],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/icon", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-[var(--border)] px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <a
                href="/"
                className="font-mono text-sm tracking-widest text-[var(--accent)]"
              >
                TIPMEBITCOIN
              </a>
              <nav className="flex gap-4 text-sm">
                <a
                  href="/claim"
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Claim
                </a>
                <a
                  href="/about"
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  About
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--border)] px-4 py-6 text-center text-xs text-[var(--text-muted)] font-mono">
            <p>NON-CUSTODIAL · NO EMAIL · NO PASSWORD</p>
            <p className="mt-2">
              <a href="/about#donate" className="hover:text-[var(--accent)]">
                Support TipMeBitcoin
              </a>
              {" · "}
              <a href="/protocol" className="hover:text-[var(--accent)]">
                Protocol
              </a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
