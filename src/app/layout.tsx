import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Cinzel, JetBrains_Mono } from "next/font/google";
import { ThemeProvider, themeBootScript } from "@/components/theme/ThemeProvider";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cinzel" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "ClassMillion",
  description: "Who wants to be a millionaire — for your classroom",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* Set data-theme before paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
