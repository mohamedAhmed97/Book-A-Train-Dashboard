"use client";
import { useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/stores/auth";

export function TRPCProvider({ children, apiUrl }: { children: React.ReactNode; apiUrl: string }) {
  const token = useAuthStore((s) => s.token);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: apiUrl, headers: () => (tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}) })],
    })
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
