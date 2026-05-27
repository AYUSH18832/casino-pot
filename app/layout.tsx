import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Royal Pot — Casino Pot Tracker",
  description: "Virtual pot tracker for Poker & Teen Patti",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ position: 'relative', zIndex: 1 }}>{children}</body>
    </html>
  );
}
