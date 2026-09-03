import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/app/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Badminton Hub",
  description: "Professional Tournament & Player Management Platform",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#1877F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Providers>
            <AuthProvider>
              <TooltipProvider>
                {children}
                <Toaster position="top-right" richColors />
              </TooltipProvider>
            </AuthProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
