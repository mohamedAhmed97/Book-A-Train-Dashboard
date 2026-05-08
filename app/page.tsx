"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function RootPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    router.replace(token ? "/dashboard" : "/(auth)/login");
  }, [token, router]);
  return null;
}
