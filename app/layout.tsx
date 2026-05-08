import type { Metadata } from "next";
import { TRPCProvider } from "@/providers/TRPCProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book a Train — Coach",
  description: "Manage your athletes and training sessions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
