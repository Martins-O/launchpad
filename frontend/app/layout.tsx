import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./providers/WalletProvider";
import { SettingsProvider } from "./providers/SettingsProvider";
import { NetworkProvider } from "./providers/NetworkProvider";
import { AccessibilityProvider } from "./providers/AccessibilityProvider";
import { LocaleProvider } from "./providers/LocaleProvider";
import { I18nProvider } from "./providers/I18nProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Navbar } from "./components/Navbar";
import { MainnetWarning } from "./components/MainnetWarning";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  ),
  title: "SoroPad — Soroban Token Launchpad",
  description:
    "Deploy and manage SEP-41 compliant tokens on Stellar Soroban. No code required.",
  openGraph: {
    title: "SoroPad — Soroban Token Launchpad",
    description:
      "Deploy and manage SEP-41 compliant tokens on Stellar Soroban. No code required.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <LocaleProvider>
          <NotificationProvider>
            <ToastProvider>
              <I18nProvider>
                <NetworkProvider>
                  <SettingsProvider>
                    <WalletProvider>
                      <AccessibilityProvider>
                        <Navbar />
                        <MainnetWarning />
                        <main id="main-content" className="pt-16" role="main">
                          <ErrorBoundary>{children}</ErrorBoundary>
                        </main>
                        <footer
                          role="contentinfo"
                          className="border-t border-white/5 py-8 text-center text-sm text-gray-500"
                        >
                          <p>
                            Built for the{" "}
                            <a
                              href="https://www.drips.network/wave"
                              className="text-stellar-400 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Stellar Wave Program
                            </a>{" "}
                            · MIT License
                          </p>
                        </footer>
                      </AccessibilityProvider>
                    </WalletProvider>
                  </SettingsProvider>
                </NetworkProvider>
              </I18nProvider>
            </ToastProvider>
          </NotificationProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
