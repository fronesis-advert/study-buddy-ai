import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const mono = Roboto_Mono({
  weight: ["400", "500", "700"],
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Study Buddy AI",
  description:
    "Real-time tutoring, adaptive quizzes, and focused study sessions powered by OpenAI and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          interSans.variable,
          mono.variable
        )}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
