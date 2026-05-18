import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interDisplay = Inter({
  subsets: ["latin"],
  variable: "--font-inter-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Silman — NDIS SIL Management",
  description:
    "Supported Independent Living management for Australian NDIS providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${interDisplay.variable} min-h-screen font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            aria-live="polite"
            toastOptions={{
              classNames: {
                toast: "rounded-2xl border-border/70 shadow-card",
              },
            }}
            richColors
            closeButton
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
