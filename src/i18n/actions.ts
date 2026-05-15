"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, locales, type Locale } from "./routing";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
