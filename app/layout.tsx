import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { TRPCProvider } from "@/providers/TRPCProvider";
import { ThemeApplier } from "@/components/ThemeApplier";
import { localeDirection, type Locale } from "@/i18n/routing";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

// Force per-request rendering so process.env["API_URL"] is read from the
// container environment at runtime, not baked in during `pnpm build`.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a Train — Coach | احجز تدريب — المدرب",
  description: "Manage your athletes and training sessions · إدارة الرياضيين وجلسات التدريب",
};

const NO_FLASH_THEME = `
try {
  var raw = localStorage.getItem("bat-coach-theme");
  var theme = raw ? JSON.parse(raw).state.theme : "light";
  if (theme === "dark") document.documentElement.classList.add("dark");
} catch (_) {}
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = localeDirection[locale];

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="bg-background text-foreground antialiased font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeApplier />
          <TRPCProvider apiUrl={process.env["API_URL"] ?? "http://localhost:3001/trpc"}>{children}</TRPCProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
