import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DemoBoard",
  description: "Next.js 게시판",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/">
              <h1 className="text-2xl font-bold hover:opacity-80 transition-opacity">
                📌 DemoBoard
              </h1>
            </Link>
            <Link href="/posts/new">
              <Button size="sm">글 작성</Button>
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-8">{children}</div>
        </main>

        <footer className="border-t bg-muted/50 py-6 text-center text-sm text-muted-foreground">
          <p>
            Built with{" "}
            <a href="https://nextjs.org" className="hover:underline">
              Next.js
            </a>
            {" & "}
            <a href="https://shadcn.com" className="hover:underline">
              shadcn/ui
            </a>
          </p>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
