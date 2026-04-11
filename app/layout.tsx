import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils/cn";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta"
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "CBIC Officer Universe",
  description:
    "Internal officer intelligence portal for CBIC postings, careers, and service timelines."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body
        className={cn(
          jakarta.variable,
          serif.variable,
          "bg-surface font-[var(--font-jakarta)] text-ink antialiased"
        )}
      >
        {children}
      </body>
    </html>
  );
}
